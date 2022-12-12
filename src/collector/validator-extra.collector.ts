import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { LCDRepository } from '../repository/lcd.repository';
import { ExternalRepository } from '../repository/external.repository';
import { ValidatorExtra } from '../entity/validator-extra.entity';
import config from '../config';
import { Validator } from '@terra-money/terra.js';

@Injectable()
export class ValidatorExtraCollector {
  constructor(
    private extRepo: ExternalRepository,
    private lcdRepo: LCDRepository,
    private validatorExtraRepo: Repository<ValidatorExtra>,
  ) {
    this.initiate().catch((err) => {
      console.error('validator extra collector start server', err);
    });
  }

  private async initiate() {
    const blockInfo = await this.lcdRepo.currentBlock();
    const height = +blockInfo.block.header.height;

    const baseValidators = await this.lcdRepo.fetchValidators();
    await this.insertValidators(baseValidators, height);
    Promise.all([this.updatePicture(baseValidators), this.updateContact(baseValidators)]).catch(console.error);

    this.lcdRepo.subscribeNewBlock(async ({ value: blockInfo }) => {
      try {
        const baseValidators = await this.lcdRepo.fetchValidators();
        this.insertValidators(baseValidators, +blockInfo.block.header.height);
      } catch (err) {
        console.error(err);
      }
    });

    setInterval(async () => {
      try {
        const baseValidators = await this.lcdRepo.fetchValidators();
        await Promise.all([this.updatePicture(baseValidators), this.updateContact(baseValidators)]);
      } catch (err) {
        console.error(err);
      }
    }, 60 * 60 * 1000);
  }

  private async insertValidators(baseValidators: Validator[], currentHeight: number) {
    const { startBlock } = config;

    const insertedValidators = await this.validatorExtraRepo.find();

    const newValidators = baseValidators.filter((v) => {
      return insertedValidators.find((row) => row.operatorAddress === v.operator_address) === undefined;
    });

    for await (const { operator_address: operatorAddress } of newValidators) {
      const height = await this.binarySearch(startBlock, currentHeight, operatorAddress);
      const time = await this.lcdRepo.blockTimeForHeight(height);

      console.log('fetched validator creation time', operatorAddress, height, time);

      await this.validatorExtraRepo.insert({
        operatorAddress,
        createdAt: time,
      });
    }
  }

  private async updatePicture(baseValidators: Validator[]) {
    try {
      for (const [index, val] of baseValidators.entries()) {
        console.log('getting picture ', index + 1, '/', baseValidators.length);
        const pictureURL = await this.extRepo.getValidatorPicture(val.description.identity);
        if (pictureURL) {
          await this.validatorExtraRepo.update({ operatorAddress: val.operator_address }, { pictureURL });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  private async updateContact(baseValidators: Validator[]) {
    try {
      for await (const { operator_address: operatorAddress } of baseValidators) {
        const contact = await this.extRepo.getValidatorProfile(operatorAddress);
        if (contact) {
          await this.validatorExtraRepo.update({ operatorAddress }, { contact });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  private async binarySearch(low: number, high: number, addr: string) {
    if (await this.lcdRepo.checkValidateExist(low, addr)) {
      return low;
    }

    low++;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const exist = await this.lcdRepo.checkValidateExist(mid, addr);
      if (exist) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return high;
  }
}
