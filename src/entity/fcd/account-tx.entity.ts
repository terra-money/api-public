import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('account_tx')
export default class AccountTxEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index('account_tx_account')
  @Column()
  account: string;

  @Index('account_tx_timestamp')
  @Column()
  timestamp: Date;
}
