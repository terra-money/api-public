import { Contact } from 'src/validator/validator-with-extra-data';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ValidatorExtra')
export class ValidatorExtra {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index({ unique: true })
  @Column()
  operatorAddress: string;

  @Column({ nullable: true })
  pictureURL: string;

  @Column({ type: 'jsonb', nullable: true })
  contact: Contact;

  @Index()
  @Column('timestamp with time zone')
  createdAt: string;
}
