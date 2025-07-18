#!/usr/bin/env node

/**
 * API 文档服务器启动脚本
 * 
 * 功能：
 * 1. 验证 OpenAPI 规范文件
 * 2. 启动 Swagger UI 文档服务器
 * 3. 提供本地文档访问
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const OPENAPI_FILE = path.join(__dirname, '..', 'openapi.yaml');
const PORT = process.env.DOCS_PORT || 8080;

/**
 * 验证 OpenAPI 文件是否存在且格式正确
 */
function validateOpenAPIFile() {
  console.log('🔍 验证 OpenAPI 文件...');
  
  if (!fs.existsSync(OPENAPI_FILE)) {
    console.error('❌ OpenAPI 文件不存在:', OPENAPI_FILE);
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(OPENAPI_FILE, 'utf8');
    const doc = yaml.load(content);
    
    if (!doc.openapi) {
      throw new Error('缺少 openapi 版本字段');
    }
    
    if (!doc.info) {
      throw new Error('缺少 info 字段');
    }
    
    if (!doc.paths) {
      throw new Error('缺少 paths 字段');
    }
    
    console.log('✅ OpenAPI 文件验证通过');
    console.log(`📋 API 标题: ${doc.info.title}`);
    console.log(`📋 API 版本: ${doc.info.version}`);
    console.log(`📋 端点数量: ${Object.keys(doc.paths).length}`);
    
    return doc;
  } catch (error) {
    console.error('❌ OpenAPI 文件格式错误:', error.message);
    process.exit(1);
  }
}

/**
 * 检查是否安装了必要的工具
 */
function checkDependencies() {
  console.log('🔧 检查依赖工具...');
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['swagger-ui-serve', '--version'], { stdio: 'pipe' });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ swagger-ui-serve 可用');
        resolve();
      } else {
        console.log('📦 正在安装 swagger-ui-serve...');
        installSwaggerUI().then(resolve).catch(reject);
      }
    });
    
    child.on('error', () => {
      console.log('📦 正在安装 swagger-ui-serve...');
      installSwaggerUI().then(resolve).catch(reject);
    });
  });
}

/**
 * 安装 Swagger UI 工具
 */
function installSwaggerUI() {
  return new Promise((resolve, reject) => {
    console.log('⏳ 安装中，请稍候...');
    
    const child = spawn('npm', ['install', '-g', 'swagger-ui-serve'], { 
      stdio: 'inherit' 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ swagger-ui-serve 安装成功');
        resolve();
      } else {
        console.error('❌ swagger-ui-serve 安装失败');
        reject(new Error('安装失败'));
      }
    });
  });
}

/**
 * 启动文档服务器
 */
function startDocServer() {
  console.log('🚀 启动文档服务器...');
  console.log(`📡 端口: ${PORT}`);
  console.log(`📄 文件: ${OPENAPI_FILE}`);
  
  const child = spawn('npx', ['swagger-ui-serve', '-p', PORT, OPENAPI_FILE], {
    stdio: 'inherit'
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ 文档服务器退出，代码: ${code}`);
    }
  });
  
  child.on('error', (error) => {
    console.error('❌ 启动文档服务器失败:', error.message);
    process.exit(1);
  });
  
  // 延迟显示访问信息
  setTimeout(() => {
    console.log('\n🎉 文档服务器启动成功！');
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log('📚 在浏览器中查看 API 文档');
    console.log('\n💡 提示:');
    console.log('  - 使用 Ctrl+C 停止服务器');
    console.log('  - 修改 openapi.yaml 后需要重启服务器');
    console.log('  - 可以直接在 Swagger UI 中测试 API');
  }, 2000);
}

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log(`
📚 SightAI API 文档服务器

用法:
  node serve-docs.js [选项]

选项:
  --help, -h     显示帮助信息
  --port, -p     指定端口号 (默认: 8080)
  --validate     仅验证 OpenAPI 文件

环境变量:
  DOCS_PORT      文档服务器端口号

示例:
  node serve-docs.js                    # 启动文档服务器
  node serve-docs.js --port 9000        # 在端口 9000 启动
  node serve-docs.js --validate         # 仅验证文件
  DOCS_PORT=9000 node serve-docs.js     # 使用环境变量设置端口
`);
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  // 处理命令行参数
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--validate')) {
    validateOpenAPIFile();
    console.log('✅ 验证完成');
    return;
  }
  
  // 处理端口参数
  const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  if (portIndex !== -1 && args[portIndex + 1]) {
    process.env.DOCS_PORT = args[portIndex + 1];
  }
  
  try {
    // 验证文件
    validateOpenAPIFile();
    
    // 检查依赖
    await checkDependencies();
    
    // 启动服务器
    startDocServer();
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭文档服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 正在关闭文档服务器...');
  process.exit(0);
});

// 启动
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 未处理的错误:', error);
    process.exit(1);
  });
}

module.exports = {
  validateOpenAPIFile,
  startDocServer
};
