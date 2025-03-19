export abstract class NodeService {
  abstract getCurrentNodeInfo(): Promise<{
    cpu_usage: number;
    memory_usage: number;
    gpu_usage: number | null;
    timestamp: string;
  }>;
}
