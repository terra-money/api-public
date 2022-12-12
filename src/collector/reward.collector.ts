import config from '../config';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, MoreThan, Between } from 'typeorm';
import { Mutex } from 'async-mutex';

import { LCDRepository } from '../repository/lcd.repository';
import { RPCRepository } from '../repository/rpc.repository';

import { BlockInfo } from '@terra-money/terra.js';
import { RewardCommission } from '../entity/reward-commission.entity';
import { BlockTime } from '../entity/block-time.entity';
import { filterLuna, parseDenomAmountListFromText } from './denom-amount';
import BigNumber from 'bignumber.js';

@Injectable()
export class RewardCollector {
  private mutex = new Mutex();

  constructor(
    @InjectRepository(RewardCommission)
    private rewardRepo: Repository<RewardCommission>,
    @InjectRepository(BlockTime) private blockRepo: Repository<BlockTime>,
    private connection: Connection,
    private lcdRepo: LCDRepository,
    private rpcRepo: RPCRepository,
  ) {
    this.generateInitialData().catch((err) => {
      console.error('cannot start server', err);
    });
  }

  private async generateInitialData() {
    const blockInfo = await this.lcdRepo.currentBlock();
    this.startFetchTimer(+blockInfo.block.header.height);
    await this.fillMissedBlocks(blockInfo);
  }

  private startFetchTimer(lastBlockHeight: number) {
    this.lcdRepo.subscribeNewBlock(async ({ value: blockInfo }) => {
      try {
        // check missed block - missing while web socket reconnecting
        for (let height = lastBlockHeight + 1; height < +blockInfo.block.header.height; height++) {
          console.log('delayed subscribed', height);
          this.processBlock(height);
        }

        console.log('subscribed', blockInfo.block.header.height);
        this.processBlock(blockInfo);
        lastBlockHeight = +blockInfo.block.header.height;
      } catch (e) {
        console.error(e);
      }
    });
  }

  private async processBlock(blockOrHeight: BlockInfo | number) {
    let block: BlockInfo;
    let height: number;

    await this.mutex
      .runExclusive(async () => {
        if (typeof blockOrHeight === 'number') {
          block = await this.lcdRepo.block(blockOrHeight);
          height = blockOrHeight;
        } else {
          block = blockOrHeight;
          height = +block.block.header.height;
        }

        console.log('processing block #', block.block.header.height);
        console.time('time elapsed for #' + block.block.header.height);

        const [delegationAmountMap, blockResults] = await Promise.all([
          this.lcdRepo.fetchValidatorTokenMap(height),
          this.rpcRepo.getCommissionAndRewards(height),
        ]).catch((e) => {
          setTimeout(() => {
            this.processBlock(blockOrHeight);
          }, 500);

          throw e;
        });

        await this.connection.transaction(async (manager) => {
          for (const [operatorAddress, value] of blockResults) {
            const commissionsList = value.commissions.map(parseDenomAmountListFromText);
            const rewardsList = value.rewards.map(parseDenomAmountListFromText);

            const commissionInLuna = BigNumber.sum(
              0, // start with 0 for empty array
              ...commissionsList.map((denomAmounts) => filterLuna(denomAmounts)),
            );
            const rewardsInLuna = BigNumber.sum(0, ...rewardsList.map((denomAmounts) => filterLuna(denomAmounts)));

            const userTake = rewardsInLuna.minus(commissionInLuna);

            const delegation = delegationAmountMap[operatorAddress];
            const userTakeHomeRate = delegation === '0' ? '0' : userTake.div(delegation).toString();

            await manager.save(
              this.rewardRepo.create({
                height,
                operatorAddress,
                rewards: rewardsInLuna.toString(),
                comissions: commissionInLuna.toString(),
                delegation,
                userTakeHomeRate,
              }),
            );
          }

          await manager.save(this.blockRepo.create({ height, time: block.block.header.time }));
          console.timeEnd('time elapsed for #' + block.block.header.height);
        });

        const interval = 1000;
        if (height % interval === 0) {
          const min = height - (interval - 1);
          const max = height;
          const count = await this.blockRepo.count({
            where: {
              height: Between(min, max),
            },
          });
          if (count === interval) {
            await this.saveRewardSum(min, max);
          }
        }
      })
      .catch(console.error);
  }

  private async saveRewardSum(heightStart: number, heightEnd: number) {
    const selectQuery = `SELECT ${heightStart} as heightStart, ${heightEnd} as heightEnd, "operatorAddress", SUM("userTakeHomeRate") as userTakeHomeRate
    FROM "RewardCommissionHistory"
    WHERE "height" BETWEEN ${heightStart} AND ${heightEnd}
    GROUP BY "operatorAddress"`;
    const insertQuery = `INSERT INTO "RewardSum" ${selectQuery}`;
    return this.connection.query(insertQuery);
  }

  // fill from current to 30 days ago
  private async fillMissedBlocks(latestBlock: BlockInfo) {
    const latestBlockDate = new Date(latestBlock.block.header.time);

    const periodDay = config.reward.collectWindow;
    const periodMs = +periodDay * 24 * 60 * 60 * 1000;
    const targetDate = new Date();
    targetDate.setTime(latestBlockDate.getTime() - periodMs);

    const insertedBlocks = await this.blockRepo
      .find({
        select: ['height'],
        where: {
          time: MoreThan(targetDate),
        },
      })
      .then((rows) => rows.map((row) => +row.height));

    let height = +latestBlock.block.header.height;
    do {
      // skip if block is already inserted
      if (insertedBlocks.includes(height)) {
        console.log('skipping block #', height);
        if (config.reward.stopCollectOnCollision) break;
      } else {
        console.log('fetching block #', height);

        const block = height === +latestBlock.block.header.height ? latestBlock : await this.lcdRepo.block(height);
        const date = new Date(block.block.header.time);

        // stop if block time is before 30 days
        if (latestBlockDate.getTime() - date.getTime() > periodMs) break;

        await this.processBlock(block);
      }

      height--;
    } while (true);
  }
}
