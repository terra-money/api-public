import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { BalanceService } from './balances.service';
import { BigNumber } from 'bignumber.js';

@Controller('balance')
export class BalanceController {
  constructor(private balanceService: BalanceService) {}

  @Get('circulating-supply')
  async getCirculatingSupply(@Query('height') height: string | undefined) {
    const h = Number(height ?? '0');
    const cs = await this.balanceService.getCirculatingSupply(h);
    if (!cs) {
      throw new NotFoundException();
    }
    return cs;
  }

  @Get('circulating-supply/luna')
  async getCirculatingSupplyLuna(@Query('height') height: string | undefined) {
    const h = Number(height ?? '0');
    const cs = await this.balanceService.getCirculatingSupply(h);
    if (!cs) {
      throw new NotFoundException();
    }
    const csn = new BigNumber(cs, 10);
    return csn.shiftedBy(-6).toString();
  }
}
