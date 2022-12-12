import { Module } from '@nestjs/common';
import { BalanceService } from './balances.service';
import { BalanceController } from './balances.controller';

import { ProposalModule } from 'src/proposal/proposal.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CirculatingSupply } from 'src/entity';

@Module({
  imports: [TypeOrmModule.forFeature([CirculatingSupply], 'api'), ProposalModule],
  providers: [BalanceService],
  controllers: [BalanceController],
  exports: [BalanceService],
})
export class BalanceModule {}
