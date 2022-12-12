import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('RewardSum')
export class RewardSum {
  @PrimaryColumn('bigint')
  heightStart: number;

  @PrimaryColumn('bigint')
  heightEnd: number;

  @PrimaryColumn()
  operatorAddress: string;

  @Column('decimal', { precision: 40, scale: 20 })
  userTakeHomeRate: string;
}
