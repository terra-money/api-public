import { Controller, Get, NotFoundException } from '@nestjs/common';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(private service: WalletsService) {}

  @Get('new')
  async getNewAccounts() {
    const accounts = await this.service.getNewAccounts();

    if (accounts) {
      return accounts;
    }

    throw new NotFoundException();
  }

  @Get('total')
  async getTotalAccounts() {
    const accounts = await this.service.getTotalAccounts();

    if (accounts) {
      return accounts;
    }

    throw new NotFoundException();
  }

  @Get('active')
  async getActiveAccounts() {
    const accounts = await this.service.getActiveAccounts();

    if (accounts) {
      return accounts;
    }

    throw new NotFoundException();
  }

  @Get('active/sum')
  getActiveSumData() {
    return this.service.activeAccountSum();
  }
}
