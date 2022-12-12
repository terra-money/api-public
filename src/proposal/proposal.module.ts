import { Module } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { ProposalController } from './proposal.controller';
import { LCDRepository } from 'src/repository/lcd.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal, ValidatorVotes } from 'src/entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proposal, ValidatorVotes], 'api')],
  providers: [ProposalService, LCDRepository],
  controllers: [ProposalController],
  exports: [ProposalService],
})
export class ProposalModule {}
