import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ProposalService } from './proposal.service';

@Controller('proposals?')
export class ProposalController {
  constructor(private proposalService: ProposalService) {}

  @Get(':proposalId')
  async getProposalVotes(@Param('proposalId', new ParseIntPipe()) proposalId: string) {
    const votes = await this.proposalService.getVotesforProposal(proposalId);
    if (votes) {
      return votes;
    }

    throw new NotFoundException();
  }
}
