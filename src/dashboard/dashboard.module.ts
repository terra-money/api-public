import { Module } from '@nestjs/common';

import { TxVolumeController } from './tx-volume.controller';
import { StakingReturnController } from './staking-return.controller';
import { WalletsController } from './wallets.controller';
import { StakingReturnService } from './staking-return.service';
import { TxVolumeService } from './tx-volume.service';
import { WalletsService } from './wallets.service';

@Module({
  providers: [TxVolumeService, StakingReturnService, WalletsService],
  controllers: [TxVolumeController, StakingReturnController, WalletsController],
})
export class DashboardModule {}
