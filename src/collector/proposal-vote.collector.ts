import { Injectable } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProposalStatus } from '@terra-money/terra.proto/cosmos/gov/v1beta1/gov';
import { ValAddress, WeightedVoteOption } from '@terra-money/terra.js';

import { LCDRepository } from '../repository/lcd.repository';
import { Proposal, ValidatorVotes } from '../entity';

export type ProposalStatusMap = Map<number, ProposalStatus>;

export interface ProposalVoteHistory {
  voter: string;
  options: WeightedVoteOption.Data[];
}

@Injectable()
export class ProposalVoteCollector {
  constructor(
    private lcdRepo: LCDRepository,
    @InjectRepository(Proposal)
    private proposalRepo: Repository<Proposal>,
    private connection: Connection,
  ) {
    this.generateInitialData()
      .then(() => {
        this.startFetchTimer();
      })
      .catch((err) => {
        console.error('cannot start server', err);
      });
  }

  private async generateInitialData() {
    await this.updateValidatorVotesHistory();
  }

  private startFetchTimer() {
    this.lcdRepo.subscribeNewBlock(async () => {
      try {
        await this.updateValidatorVotesHistory();
      } catch (e) {
        console.error(e);
      }
    });
  }

  async updateValidatorVotesHistory() {
    console.log('starting update validator votes');
    const baseValidators = await this.lcdRepo.fetchValidators();
    const validatorAddrList = baseValidators.map((v) => v.operator_address);
    const proposals = await this.lcdRepo.getProposals();

    const previousStatusMap = await this.proposalRepo.find();

    for (const p of proposals) {
      const previousStatus = previousStatusMap.find((prev) => prev.proposalId === p.id)?.status;

      let voteHistory: Record<string, WeightedVoteOption.Data[]>;

      // we can use lcd for proposals in voting
      if (p.status === ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD) {
        console.log('proposal updating', p.id, p.status);

        try {
          voteHistory = await this.lcdRepo.getCurrentProposalVotes(p.id.toString());
        } catch (err) {
          console.error('on voting proposal update error', p.id, err);
          continue;
        }
      } else if (p.status !== previousStatus) {
        // should use tx search
        console.log('proposal changed', p.id, p.status, previousStatus);
        try {
          if (p.status === ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD) {
            voteHistory = await this.lcdRepo.getCurrentProposalVotes(p.id.toString());
          } else {
            voteHistory = await this.lcdRepo.getProposalVotes(p.id.toString());
          }
        } catch (err) {
          console.error('proposal update error', p.id, err);
          continue;
        }
      } else {
        continue;
      }

      console.log('vote history fetched');

      await this.connection
        .transaction(async (manager) => {
          for (const accountAddr of Object.keys(voteHistory)) {
            const operatorAddr = ValAddress.fromAccAddress(accountAddr);
            if (!ValAddress.validate(operatorAddr)) continue;
            if (!validatorAddrList.includes(operatorAddr)) continue;

            await manager.upsert(
              ValidatorVotes,
              {
                operatorAddress: operatorAddr,
                proposalId: p.id,
                votes: voteHistory[accountAddr],
              },
              ['operatorAddress', 'proposalId'],
            );
          }

          // console.log(`update ${list.length} / ${Object.keys(voteHistory).length} items`);

          await manager.upsert(
            Proposal,
            {
              proposalId: p.id,
              title: p.content?.title ?? '',
              votingEndTime: p.voting_end_time,
              status: p.status,
            },
            ['proposalId'],
          );
        })
        .catch(console.error);
    }
  }
}
