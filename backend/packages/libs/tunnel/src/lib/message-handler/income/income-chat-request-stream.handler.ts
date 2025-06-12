import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ChatRequestStreamMessage, ChatRequestStreamMessageSchema, ChatResponseStreamMessage, OpenAIChatCompletionChunk } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';
import { UnifiedModelService } from '@saito/model-inference-client';

/**
 * 流式聊天请求处理器
 * 
 * 接收流式聊天请求并执行推理，根据path区分Ollama或OpenAI
 */
@MessageHandler({ type: 'chat_request_stream', direction: 'income' })
@Injectable()
export class IncomeChatRequestStreamHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeChatRequestStreamHandler.name);

  // 用于累积Ollama流式数据的缓冲区
  private streamBuffers = new Map<string, string>();

  // 用于累积增量内容的缓冲区（避免频繁发送小块）
  private contentBuffers = new Map<string, {
    incrementalContent: string; // 增量内容
    lastSendTime: number;
    messageCount: number;
    totalSent: number; // 已发送的总字符数
  }>();

  // 批量发送配置
  private readonly BATCH_SEND_INTERVAL = 100; // 100ms批量发送间隔
  private readonly MIN_CONTENT_LENGTH = 5; // 最小内容长度才发送（降低阈值）
  private readonly MAX_BUFFER_TIME = 200; // 最大缓冲时间200ms（降低延迟）

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
    private readonly unifiedModelService: UnifiedModelService
  ) {
    super();
  }

  /**
   * 处理入站流式聊天请求消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.log(`🎯 IncomeChatRequestStreamHandler 收到消息!`);
    this.logger.log(`当前设备ID (peerId): ${this.peerId}`);
    this.logger.log(`消息目标: ${message.to}`);
    this.logger.log(`消息来源: ${message.from}`);
    this.logger.debug(`收到流式聊天请求: ${JSON.stringify(message)}`);

    try {
      // 先尝试解析标准格式
      let chatRequestMessage: ChatRequestStreamMessage;
      const parseResult = ChatRequestStreamMessageSchema.safeParse(message);

      if (parseResult.success) {
        this.logger.log(`✅ 使用标准格式解析消息`);
        chatRequestMessage = parseResult.data as ChatRequestStreamMessage;
      } else {
        this.logger.log(`⚠️ 标准格式解析失败，尝试嵌套data格式`);
        this.logger.debug(`解析错误: ${parseResult.error.message}`);
        // 如果标准格式失败，尝试解析嵌套data格式
        chatRequestMessage = this.parseNestedDataFormat(message);
        this.logger.log(`✅ 嵌套data格式解析成功`);
      }

      this.logger.log(`🚀 开始执行流式聊天推理...`);
      // 执行流式聊天推理
      await this.processChatRequestStream(chatRequestMessage);

    } catch (error) {
      this.logger.error(`❌ 处理流式聊天请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析嵌套data格式的消息
   */
  private parseNestedDataFormat(message: TunnelMessage): ChatRequestStreamMessage {
    const payload = message.payload as any;

    if (!payload.taskId || !payload.data) {
      throw new Error('Invalid nested data format: missing taskId or data');
    }

    const data = payload.data;

    // 转换为标准格式
    return {
      type: 'chat_request_stream',
      from: message.from,
      to: message.to,
      payload: {
        taskId: payload.taskId,
        path: payload.path || '/ollama/api/chat', // 默认路径
        data
      }
    };
  }

  /**
   * 处理流式聊天请求并执行推理
   */
  private async processChatRequestStream(message: ChatRequestStreamMessage): Promise<void> {
    const { taskId, path, data } = message.payload;

    this.logger.log(`执行流式聊天推理 - TaskID: ${taskId}, Path: ${path}`);

    // 验证请求数据
    if (!data || !data.messages || data.messages.length === 0) {
      throw new Error('Invalid chat request: missing messages');
    }

    // 构建请求参数
    const requestParams = {
      messages: data.messages,
      model: data.model || 'deepscaler:latest',
      stream: true,
      temperature: data.temperature || 0.7,
      max_tokens: data.max_tokens || 2048,
      top_p: data.top_p || 1.0,
      frequency_penalty: data.frequency_penalty || 0,
      presence_penalty: data.presence_penalty || 0
    };

    this.logger.debug(`调用UnifiedModelService: ${JSON.stringify(message)}`);

    try {
      // 创建模拟的Response对象来处理流式响应
      const mockResponse = this.createStreamResponseHandler(taskId, message.from, path);

      // 直接调用UnifiedModelService
      await this.unifiedModelService.chat(requestParams, mockResponse as any, path);

    } catch (error) {
      this.logger.error(`推理执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 创建流式响应处理器
   * 模拟Express Response对象，用于处理UnifiedModelService的流式响应
   */
  private createStreamResponseHandler(taskId: string, targetDeviceId: string, path: string) {
    const self = this;

    return {
      // Express Response 接口方法
      setHeader: () => { },
      status: () => ({ json: () => { } }),
      json: () => { },
      headersSent: false,

      // 流式写入方法
      write: async (chunk: string | Buffer | object) => {
        try {
          // 处理不同类型的chunk，统一转换为文本
          let text: string;

          if (typeof chunk === 'string') {
            text = chunk;
          } else if (Buffer.isBuffer(chunk)) {
            text = chunk.toString('utf8');
          } else if (chunk && typeof chunk === 'object') {
            // 检查是否是Uint8Array或类似的数字数组
            if (Array.isArray(chunk) || ('length' in chunk && typeof (chunk as ArrayLike<number>).length === 'number')) {
              // 将数字数组转换为Buffer然后转换为字符串
              const uint8Array = new Uint8Array(chunk as ArrayLike<number>);
              text = Buffer.from(uint8Array).toString('utf8');
            } else {
              // 如果是其他类型的对象，直接发送
              await self.sendStreamChunk(taskId, targetDeviceId, chunk);
              return;
            }
          } else {
            text = String(chunk);
          }

          // 只在非常详细的调试模式下记录原始数据
          if (process.env['VERBOSE_STREAM_DEBUG'] === 'true') {
            self.logger.debug(`Received raw chunk: ${text.substring(0, 100)}...`);
          }

          // 统一处理为OpenAI SSE格式并转换为JSON对象
          await self.handleOpenAISSEChunk(taskId, targetDeviceId, text);
        } catch (error) {
          self.logger.error(`Error processing chunk: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      },

      // 流式结束方法
      end: async () => {
        await self.sendStreamComplete(taskId, targetDeviceId);
      }
    };
  }

  /**
   * 处理OpenAI SSE流式数据块并转换为JSON
   */
  private async handleOpenAISSEChunk(taskId: string, targetDeviceId: string, text: string): Promise<void> {
    try {
      // 获取或创建缓冲区
      const bufferKey = `${taskId}-${targetDeviceId}`;
      let buffer = this.streamBuffers.get(bufferKey) || '';

      // 累积数据
      buffer += text;

      // 按行分割处理SSE数据
      const lines = buffer.split('\n');
      let processedLines = 0;

      for (let i = 0; i < lines.length - 1; i++) { // 保留最后一行，可能不完整
        const line = lines[i].trim();

        if (line.startsWith('data: ')) {
          const data = line.slice(6); // 移除 "data: " 前缀

          if (data === '[DONE]') {
            // 发送完成信号
            await this.sendStreamComplete(taskId, targetDeviceId);
            // 清理缓冲区
            this.streamBuffers.delete(bufferKey);
            return;
          }

          try {
            // 解析JSON数据并直接发送
            const jsonData = JSON.parse(data);
            this.logger.debug(`解析OpenAI SSE数据: ${JSON.stringify(jsonData)}`);

            // 直接发送解析后的JSON对象（已经是OpenAI格式）
            await this.sendStreamChunk(taskId, targetDeviceId, jsonData);
            processedLines = i + 1;
          } catch (parseError) {
            this.logger.warn(`Failed to parse OpenAI SSE data: ${data}`);
            processedLines = i + 1; // 跳过这一行
          }
        } else if (line === '' || line.startsWith(':')) {
          // 空行或注释行，跳过
          processedLines = i + 1;
        } else {
          // 其他格式的行，跳过
          processedLines = i + 1;
        }
      }

      // 更新缓冲区，保留未处理的数据
      const remainingBuffer = lines.slice(processedLines).join('\n');
      if (remainingBuffer.trim()) {
        this.streamBuffers.set(bufferKey, remainingBuffer);
      } else {
        this.streamBuffers.delete(bufferKey);
      }

    } catch (error) {
      this.logger.error(`Error handling OpenAI SSE chunk: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 判断是否为Ollama路径
   */
  private isOllamaPath(path: string): boolean {
    return path.includes('/ollama/') || path.includes('/api/chat');
  }

  /**
   * 处理Ollama流式数据块（累积并解析完整JSON）
   */
  private async handleOllamaStreamChunk(taskId: string, targetDeviceId: string, text: string): Promise<void> {
    try {
      // 获取或创建缓冲区
      const bufferKey = `${taskId}-${targetDeviceId}`;
      let buffer = this.streamBuffers.get(bufferKey) || '';

      // 累积数据
      buffer += text;

      // 尝试解析完整的JSON行
      const lines = buffer.split('\n');
      let processedLines = 0;

      for (let i = 0; i < lines.length - 1; i++) { // 保留最后一行，可能不完整
        const line = lines[i].trim();
        if (line) {
          try {
            const parsed = JSON.parse(line);

            // 检查是否是完成信号
            if (parsed.done === true) {
              // 发送最后累积的内容
              await this.flushContentBuffer(taskId, targetDeviceId);
              await this.sendStreamComplete(taskId, targetDeviceId);
              // 清理所有缓冲区
              this.streamBuffers.delete(bufferKey);
              this.contentBuffers.delete(bufferKey);
              return;
            }

            // 智能批量处理内容
            await this.handleContentChunk(taskId, targetDeviceId, parsed);
            processedLines = i + 1;
          } catch (parseError) {
            this.logger.warn(`Failed to parse Ollama stream line: ${line}`);
            processedLines = i + 1; // 跳过这一行
          }
        } else {
          processedLines = i + 1;
        }
      }

      // 更新缓冲区，保留未处理的数据
      const remainingBuffer = lines.slice(processedLines).join('\n');
      if (remainingBuffer.trim()) {
        this.streamBuffers.set(bufferKey, remainingBuffer);
      } else {
        this.streamBuffers.delete(bufferKey);
      }

    } catch (error) {
      this.logger.error(`Error handling Ollama stream chunk: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }



  /**
   * 智能处理内容块（增量发送优化）
   */
  private async handleContentChunk(taskId: string, targetDeviceId: string, parsed: any): Promise<void> {
    const bufferKey = `${taskId}-${targetDeviceId}`;
    const now = Date.now();

    // 获取或创建内容缓冲区
    let contentBuffer = this.contentBuffers.get(bufferKey);
    if (!contentBuffer) {
      contentBuffer = {
        incrementalContent: '',
        lastSendTime: now,
        messageCount: 0,
        totalSent: 0
      };
      this.contentBuffers.set(bufferKey, contentBuffer);
    }

    // 提取当前消息的完整内容
    const fullContent = parsed.message?.content || '';

    if (fullContent) {
      // 计算增量内容（只发送新增的部分）
      const newContent = fullContent.slice(contentBuffer.totalSent);

      if (newContent) {
        contentBuffer.incrementalContent += newContent;
        contentBuffer.messageCount++;

        // 判断是否需要发送
        const shouldSend = this.shouldSendBuffer(contentBuffer, now);

        if (shouldSend) {
          await this.sendIncrementalContent(taskId, targetDeviceId, contentBuffer, parsed);
          // 更新已发送的总长度
          contentBuffer.totalSent += contentBuffer.incrementalContent.length;
          // 重置增量缓冲区
          contentBuffer.incrementalContent = '';
          contentBuffer.lastSendTime = now;
          contentBuffer.messageCount = 0;
        }
      }
    }
  }

  /**
   * 判断是否应该发送缓冲区内容
   */
  private shouldSendBuffer(buffer: { incrementalContent: string; lastSendTime: number; messageCount: number; totalSent: number }, now: number): boolean {
    // 内容长度达到阈值
    if (buffer.incrementalContent.length >= this.MIN_CONTENT_LENGTH) {
      return true;
    }

    // 时间间隔达到阈值
    if (now - buffer.lastSendTime >= this.MAX_BUFFER_TIME) {
      return buffer.incrementalContent.length > 0;
    }

    // 消息数量达到阈值（避免过度累积）
    if (buffer.messageCount >= 3) { // 降低阈值，更快发送
      return true;
    }

    return false;
  }

  /**
   * 发送增量内容
   */
  private async sendIncrementalContent(taskId: string, targetDeviceId: string, buffer: { incrementalContent: string; lastSendTime: number; messageCount: number; totalSent: number }, originalParsed: any): Promise<void> {
    if (!buffer.incrementalContent) return;

    // 创建增量消息，只包含新增内容
    const incrementalChunk = {
      ...originalParsed,
      message: {
        ...originalParsed.message,
        content: buffer.incrementalContent // 只发送增量内容
      },
      // 添加增量信息
      _incremental: {
        messageCount: buffer.messageCount,
        incrementalLength: buffer.incrementalContent.length,
        totalSent: buffer.totalSent + buffer.incrementalContent.length
      }
    };

    this.logger.debug(`📦 发送增量内容 - TaskID: ${taskId}, 增量长度: ${buffer.incrementalContent.length}, 总发送: ${buffer.totalSent + buffer.incrementalContent.length}`);
    await this.sendStreamChunk(taskId, targetDeviceId, incrementalChunk);
  }

  /**
   * 刷新内容缓冲区（发送剩余增量内容）
   */
  private async flushContentBuffer(taskId: string, targetDeviceId: string): Promise<void> {
    const bufferKey = `${taskId}-${targetDeviceId}`;
    const contentBuffer = this.contentBuffers.get(bufferKey);

    if (contentBuffer && contentBuffer.incrementalContent) {
      // 创建最终增量消息
      const finalChunk = {
        model: 'deepscaler:latest',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: contentBuffer.incrementalContent // 发送剩余的增量内容
        },
        done: false,
        _incremental: {
          messageCount: contentBuffer.messageCount,
          incrementalLength: contentBuffer.incrementalContent.length,
          totalSent: contentBuffer.totalSent + contentBuffer.incrementalContent.length,
          isFinal: true
        }
      };

      this.logger.debug(`🔄 刷新最终增量内容 - TaskID: ${taskId}, 增量长度: ${contentBuffer.incrementalContent.length}`);
      await this.sendStreamChunk(taskId, targetDeviceId, finalChunk);
    }
  }

  /**
   * 解析并发送流式数据（OpenAI格式）
   */
  private async parseAndSendStreamData(taskId: string, targetDeviceId: string, text: string): Promise<void> {
    try {
      const lines = text.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            await this.flushContentBuffer(taskId, targetDeviceId);
            await this.sendStreamComplete(taskId, targetDeviceId);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            await this.handleContentChunk(taskId, targetDeviceId, parsed);
          } catch (parseError) {
            this.logger.warn(`Failed to parse stream data: ${data}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error parsing stream data: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 发送流式数据块（OpenAI格式）
   */
  private async sendStreamChunk(taskId: string, targetDeviceId: string, chunk: any): Promise<void> {
    // 只在debug级别记录详细信息，避免频繁日志
    const chunkInfo = this.getChunkInfo(chunk);
    this.logger.debug(`📤 发送数据块 - TaskID: ${taskId}, ${chunkInfo}`);

    const streamMessage: ChatResponseStreamMessage = {
      type: 'chat_response_stream',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        path: '', // 响应时path可以为空
        data: chunk
      }
    };

    // 使用 handleMessage 让系统自动判断发送目标
    await this.tunnel.handleMessage(streamMessage);
  }

  /**
   * 获取数据块信息（用于日志）
   */
  private getChunkInfo(chunk: unknown): string {
    try {
      if (chunk && typeof chunk === 'object') {
        const obj = chunk as any;

        // 检查是否是批量消息
        if (obj._batched) {
          return `批量消息(${obj._batched.messageCount}条, ${obj._batched.contentLength}字符)`;
        }

        // 检查是否有内容
        if (obj.message?.content) {
          const content = obj.message.content;
          const preview = content.length > 20 ? content.substring(0, 20) + '...' : content;
          return `内容: "${preview}" (${content.length}字符)`;
        }

        // 其他类型的对象
        return `对象: ${Object.keys(obj).join(', ')}`;
      }

      return `类型: ${typeof chunk}`;
    } catch (error) {
      return '解析失败';
    }
  }

  /**
   * 发送流式完成信号
   */
  private async sendStreamComplete(taskId: string, targetDeviceId: string): Promise<void> {
    // 清理所有缓冲区
    const bufferKey = `${taskId}-${targetDeviceId}`;
    this.streamBuffers.delete(bufferKey);
    this.contentBuffers.delete(bufferKey);

    this.logger.log(`✅ 流式推理完成 - TaskID: ${taskId}, Target: ${targetDeviceId}`);

    const completeMessage: ChatResponseStreamMessage = {
      type: 'chat_response_stream',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        path: '', // 响应时path可以为空
        data: {
          id: `chatcmpl-${taskId}`,
          object: 'chat.completion.chunk' as const,
          created: Math.floor(Date.now() / 1000),
          model: 'unknown',
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }],
          done: true
        }
      } as any
    };

    // 使用 handleMessage 让系统自动判断发送目标
    await this.tunnel.handleMessage(completeMessage);
  }

  /**
   * 发送错误响应
   */
  private async sendErrorResponse(originalMessage: ChatResponseStreamMessage, error: string): Promise<void> {
    const errorMessage: ChatResponseStreamMessage = {
      type: 'chat_response_stream',
      from: this.peerId,
      to: originalMessage.from,
      payload: {
        taskId: originalMessage.payload.taskId,
        path: '', // 响应时path可以为空
        data: {
          id: `chatcmpl-error-${Date.now()}`,
          object: 'chat.completion.chunk' as const,
          created: Math.floor(Date.now() / 1000),
          model: 'unknown',
          choices: [{
            index: 0,
            delta: {
              role: 'assistant',
              content: '发生错误: ' + error
            },
            finish_reason: 'stop'
          }],
          done: true,
        },
        error
      } as any
    };

    await this.tunnel.sendMessage(errorMessage);
  }
}
