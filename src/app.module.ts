import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ValidatorModule } from './validator/validator.module';
import { ProposalModule } from './proposal/proposal.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TxHistoryModule } from './tx-history/tx-history.module';
import { LCDRepository } from './repository/lcd.repository';
import { RPCRepository } from './repository/rpc.repository';
import { ExternalRepository } from './repository/external.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from './config';
import apiEntities from './entity';
import fcdEntities from './entity/fcd';
import { RouterModule } from '@nestjs/core';
import { BalanceModule } from './balances/balances.module';

@Module({
  imports: [
    RouterModule.register([{ path: 'chart', module: DashboardModule }]),
    ValidatorModule,
    ProposalModule,
    DashboardModule,
    TxHistoryModule,
    BalanceModule,
    TypeOrmModule.forRoot({
      name: 'fcd',
      entities: fcdEntities,
      ...config.orm.fcd,
    }),
    TypeOrmModule.forRoot({
      name: 'api',
      entities: apiEntities,
      ...config.orm.api,
    }),
  ],
  controllers: [AppController],
  providers: [LCDRepository, RPCRepository, ExternalRepository],
})
export class AppModule {}
