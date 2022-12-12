import { Module } from '@nestjs/common';
import { TxHistoryService } from './tx-history.service';
import { TxHistoryController } from './tx-history.controller';

@Module({
  providers: [TxHistoryService],
  controllers: [TxHistoryController],
})
export class TxHistoryModule {}
