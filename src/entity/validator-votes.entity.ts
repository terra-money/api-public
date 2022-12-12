import { Index, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { WeightedVoteOption } from '@terra-money/terra.js';

@Entity('ValidatorVotes')
@Unique(['operatorAddress', 'proposalId'])
export class ValidatorVotes {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column()
  operatorAddress: string;

  @Index('int')
  @Column()
  proposalId: number;

  @Column({ type: 'jsonb' })
  votes: WeightedVoteOption.Data[];
}
