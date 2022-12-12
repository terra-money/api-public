import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ValidatorService } from './validator/validator.service';

@Controller()
export class AppController {
  constructor(private validatorService: ValidatorService) {}

  @Get('health')
  async getHealth() {
    if (this.validatorService.isReady()) {
      return 'ok';
    }

    throw new ServiceUnavailableException();
  }
}
