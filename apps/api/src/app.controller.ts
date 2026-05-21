import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'seoyoung-erp-api',
      checkedAt: new Date().toISOString(),
    };
  }
}
