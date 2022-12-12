import { ProposalStatus } from '@terra-money/terra.proto/cosmos/gov/v1beta1/gov';
import { WeightedVoteOption, ValAddress } from '@terra-money/terra.js';

export type ProposalStatusMap = Map<number, ProposalStatus>;

export interface ValidatorVote {
  options: WeightedVoteOption.Data[];
  proposal_id: string;
}

export interface ProposalVoteHistory {
  voter: ValAddress;
  options: WeightedVoteOption.Data[];
}
