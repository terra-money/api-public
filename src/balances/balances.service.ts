import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CirculatingSupply } from 'src/entity';
import { Repository } from 'typeorm';

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(CirculatingSupply, 'api')
    private circulatingSupplyRepo: Repository<CirculatingSupply>,
  ) {}

  public async getCirculatingSupply(height: number | undefined): Promise<string | undefined> {
    let qb = this.circulatingSupplyRepo.createQueryBuilder();
    if (height) {
      qb = qb.where('height <= :height', { height });
    }
    qb = qb.addOrderBy('height', 'DESC').limit(1);
    const supply = await qb.getOne();
    return supply?.supply;
  }
}
