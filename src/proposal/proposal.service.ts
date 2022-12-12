import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Proposal, ValidatorVotes } from 'src/entity';
import { Repository } from 'typeorm';
import { ProposalVoteHistory, ValidatorVote } from './types';

@Injectable()
export class ProposalService {
  constructor(
    @InjectRepository(Proposal, 'api')
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(ValidatorVotes, 'api')
    private voteRepository: Repository<ValidatorVotes>,
  ) {}

  async getProposals() {
    const proposals = await this.proposalRepository.find();
    return proposals;
  }

  async getVotesforProposal(proposalId: string): Promise<ProposalVoteHistory[] | undefined> {
    const proposal = await this.proposalRepository.findOne(proposalId);
    if (!proposal) {
      return undefined;
    }

    const rows = await this.voteRepository.find({ where: { proposalId } });
    return rows.map(({ operatorAddress, votes }) => ({
      voter: operatorAddress,
      options: votes,
    }));
  }

  async getVotesForValidator(operatorAddress: string): Promise<ValidatorVote[]> {
    const rows = await this.voteRepository.find({
      where: {
        operatorAddress,
      },
    });

    return rows.map((r) => {
      return {
        proposal_id: r.proposalId.toString(),
        options: r.votes,
      };
    });
  }
}
