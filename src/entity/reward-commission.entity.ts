import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('RewardCommissionHistory')
export class RewardCommission {
  @PrimaryColumn('bigint')
  height: number;

  @PrimaryColumn()
  operatorAddress: string;

  @Column('varchar')
  rewards: string;

  @Column('varchar')
  comissions: string;

  @Column('varchar')
  delegation: string;

  @Column('decimal', { precision: 40, scale: 20 })
  userTakeHomeRate: string;
}
