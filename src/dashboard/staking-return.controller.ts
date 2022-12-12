import { Controller, Get } from '@nestjs/common';
import { StakingReturnService } from './staking-return.service';

@Controller('staking-return')
export class StakingReturnController {
  constructor(private service: StakingReturnService) {}

  @Get('annualized')
  getAnnualizedData() {
    return this.service.getStakingAnnualReturn();
  }

  @Get('daily')
  getDailyData() {
    return this.service.getStakingDailyReturn();
  }
}
