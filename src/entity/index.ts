import { BlockTime } from './block-time.entity';
import { CirculatingSupply } from './circulating-supply.entity';
import { Proposal } from './proposal.entity';
import { RewardCommission } from './reward-commission.entity';
import { RewardSum } from './reward-sum.entity';
import { ValidatorExtra } from './validator-extra.entity';
import { ValidatorVotes } from './validator-votes.entity';

export { BlockTime, RewardCommission, RewardSum, CirculatingSupply, Proposal, ValidatorVotes, ValidatorExtra };

export default [BlockTime, RewardCommission, RewardSum, CirculatingSupply, Proposal, ValidatorVotes, ValidatorExtra];
