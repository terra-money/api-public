import { Controller, Get, Param, Query } from '@nestjs/common';
import { TxHistoryService } from './tx-history.service';

@Controller('tx-history')
export class TxHistoryController {
  constructor(private readonly service: TxHistoryService) {}

  @Get('station/:account')
  getAccountTxHistory(@Param('account') account: string, @Query('offset') offset: string) {
    return this.service.getAccountTxHistory(account, offset);
  }
}
