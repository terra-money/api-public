import { Module } from '@nestjs/common';
import { ValidatorService } from './validator.service';
import { ValidatorController } from './validator.controller';

import { ProposalModule } from 'src/proposal/proposal.module';
import { LCDRepository } from 'src/repository/lcd.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockTime } from 'src/entity/block-time.entity';
import { ExternalRepository } from 'src/repository/external.repository';
import { ValidatorExtra } from 'src/entity';

@Module({
  imports: [TypeOrmModule.forFeature([BlockTime, ValidatorExtra], 'api'), ProposalModule],
  providers: [ValidatorService, LCDRepository, ExternalRepository],
  controllers: [ValidatorController],
  exports: [ValidatorService],
})
export class ValidatorModule {}
