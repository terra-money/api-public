import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('CirculatingSupply')
export class CirculatingSupply {
  @PrimaryColumn('bigint')
  height: number;

  @Column('varchar')
  supply: string;
}
