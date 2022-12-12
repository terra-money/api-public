import { Injectable } from '@nestjs/common';
import { CirculatingSupply } from 'src/entity/circulating-supply.entity';
import { Repository } from 'typeorm';
import config from '../config';
import { LCDRepository } from '../repository/lcd.repository';

const logPrefix = '[circulating supply]';

@Injectable()
export class CirculatingSupplyCollector {
  constructor(private circulatingSupplyRepo: Repository<CirculatingSupply>, private lcdRepo: LCDRepository) {
    this.initiate().catch((err) => {
      console.error('circulating supply error', err);
    });
  }

  private async initiate() {
    const supplyCount = await this.circulatingSupplyRepo.count();
    const blockInfo = await this.lcdRepo.currentBlock();
    const height = +blockInfo.block.header.height;
    if (supplyCount === 0) {
      await this.processBlock(height, true);
    }
    this.subscribeToBlocks();
  }

  private subscribeToBlocks() {
    this.lcdRepo.subscribeNewBlock(async ({ value: blockInfo }) =>
      // Only works for new blocks. Circulating supply endpoint does not currently support archival data
      this.processBlock(+blockInfo.block.header.height).catch((e) => {
        console.error(e);
      }),
    );
  }

  private async processBlock(height: number, force = false) {
    if (!force && height % config.circulatingsupply.collectWindowBlocks !== 0) {
      // skip block
      return;
    }
    const supply = await this.lcdRepo.fetchCirculatingSupply();
    console.log(logPrefix, 'collected supply', supply, '@', height);
    await this.circulatingSupplyRepo.insert(
      this.circulatingSupplyRepo.create({
        height,
        supply,
      }),
    );
  }
}
