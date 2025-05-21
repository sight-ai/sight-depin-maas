export abstract class ModelReportingService {
  abstract reportModels(models: string[]): Promise<boolean>;
  abstract getReportedModels(): string[];
}
