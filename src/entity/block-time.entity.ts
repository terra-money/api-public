import { Index, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('BlockTime')
export class BlockTime {
  @PrimaryColumn('bigint')
  height: number;

  @Index()
  @Column('timestamp with time zone')
  time: string;
}
