import { Index, Column, Entity, PrimaryColumn } from 'typeorm';
import { ProposalStatus } from '@terra-money/terra.proto/cosmos/gov/v1beta1/gov';

@Entity('Proposal')
export class Proposal {
  @PrimaryColumn('int')
  proposalId: number;

  @Column()
  title: string;

  @Column('timestamp with time zone')
  votingEndTime: Date;

  @Index()
  @Column('int')
  status: ProposalStatus;
}
