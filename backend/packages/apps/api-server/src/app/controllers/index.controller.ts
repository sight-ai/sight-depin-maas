import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { UnifiedHealthService } from '../services/unified-health.service';

@Controller()
export class IndexController {
  constructor(
    private readonly unifiedHealthService: UnifiedHealthService
  ) {}

  @ApiExcludeEndpoint()
  @Get()
  index(): string {
    return this.unifiedHealthService.getAppInfo();
  }

  @ApiExcludeEndpoint()
  @Get('/healthz')
  health(): string {
    return this.unifiedHealthService.getSimpleHealth();
  }

  @ApiExcludeEndpoint()
  @Get('/api/v1/health')
  apiHealth(): { status: string, timestamp: string, uptime: number } {
    return this.unifiedHealthService.getDetailedHealth();
  }
}
