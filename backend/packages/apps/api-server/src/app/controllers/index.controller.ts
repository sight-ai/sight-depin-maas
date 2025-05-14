import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class IndexController {
  @ApiExcludeEndpoint()
  @Get()
  index(): string {
    return 'saito API';
  }

  @ApiExcludeEndpoint()
  @Get('/healthz')
  health(): string {
    return 'OK';
  }

  @ApiExcludeEndpoint()
  @Get('/api/v1/health')
  apiHealth(): { status: string, timestamp: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  }
}
