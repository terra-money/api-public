import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { BlockInfo, Proposal, Validator } from '@terra-money/terra.js';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import config from 'src/config';
import { BlockTime, ValidatorExtra } from 'src/entity';
import { ProposalService } from 'src/proposal/proposal.service';
import { ValidatorVote } from 'src/proposal/types';
import { LCDRepository } from 'src/repository/lcd.repository';
import { Connection, Repository, MoreThan } from 'typeorm';
import { Contact, ValidatorWithExtraData } from './validator-with-extra-data';

export type RewardSumMap = Map<string, string>;

@Injectable()
export class ValidatorService {
  private _isReady = false;

  isReady(): boolean {
    return this._isReady;
  }

  private baseValidators: Validator[];
  private rewardSumMap: RewardSumMap;
  private validators: ValidatorWithExtraData[] = [];

  constructor(
    private lcdRepo: LCDRepository,
    private proposalService: ProposalService,
    @InjectConnection('api')
    private connection: Connection,
    @InjectRepository(BlockTime, 'api')
    private blockTimeRepository: Repository<BlockTime>,
    @InjectRepository(ValidatorExtra, 'api')
    private validatorExtraRepository: Repository<ValidatorExtra>,
  ) {
    this.generateInitialData()
      .then(() => {
        this.startFetchTimer();
      })
      .catch((err) => {
        console.error('cannot start server', err);
      });
  }

  public getValidator(operatorAddress: string) {
    return this.validators?.find((v) => v.operator_address === operatorAddress);
  }

  public getValidators() {
    return this.validators ?? [];
  }

  private async generateInitialData() {
    await this.makeBaseValidatorsCache();
    const parallelJobs = [this.makeRewardSumCache()];
    await Promise.all(parallelJobs).catch(console.error);
    await this.makeResponseCache();
    this._isReady = true;
  }

  private startFetchTimer() {
    this.lcdRepo.subscribeNewBlock(async () => {
      try {
        await this.makeBaseValidatorsCache();
        await this.makeResponseCache();
      } catch (e) {
        console.error(e);
      }
    });

    setInterval(() => {
      this.makeRewardSumCache().catch(console.error);
    }, 60 * 60 * 1000);
  }

  // every hour
  async makeRewardSumCache() {
    const periodDay = config.reward.collectWindow;
    const periodMs = +periodDay * 24 * 60 * 60 * 1000;
    const targetDate = new Date();
    targetDate.setTime(targetDate.getTime() - periodMs);
    console.log('making reward commission from ', targetDate);

    const firstHeight = await this.blockTimeRepository.findOne({
      where: { time: MoreThan(targetDate) },
      order: { time: 'ASC' },
    });

    const lastHeight = await this.blockTimeRepository.findOne({
      order: { time: 'DESC' },
    });

    if (!firstHeight || !lastHeight) {
      throw 'cannot find block range for reward commission history';
    }

    const interval = 1000;
    const floorForInterval = (v: number) => Math.floor(v / interval) * interval;

    // separate query into head, body, foot sections
    // ranges are inclusive
    const headRange = [+firstHeight.height, floorForInterval(+firstHeight.height + interval)];
    const bodyRange = [headRange[1] + 1, floorForInterval(+lastHeight.height)];
    const footRange = [bodyRange[1] + 1, +lastHeight.height];

    console.log('querying rewards in ranges', headRange, bodyRange, footRange);

    const headQuery = `SELECT "operatorAddress", SUM("userTakeHomeRate") as amount FROM "RewardCommissionHistory" 
    WHERE "height" BETWEEN ${headRange[0]} AND ${headRange[1]} 
    GROUP BY "operatorAddress"`;
    const bodyQuery = `SELECT "operatorAddress", SUM("userTakeHomeRate") as amount FROM "RewardSum" 
    WHERE "heightStart" >= ${bodyRange[0]} AND "heightEnd" <= ${bodyRange[1]} 
    GROUP BY "operatorAddress"`;
    const footQuery = `SELECT "operatorAddress", SUM("userTakeHomeRate") as amount FROM "RewardCommissionHistory" 
    WHERE "height" BETWEEN ${footRange[0]} AND ${footRange[1]} 
    GROUP BY "operatorAddress"`;

    type ValidatorRewardSumRes = { operatorAddress: string; amount: string };
    const headRes: ValidatorRewardSumRes[] = await this.connection.query(headQuery);
    const bodyRes: ValidatorRewardSumRes[] = await this.connection.query(bodyQuery);
    const footRes: ValidatorRewardSumRes[] = await this.connection.query(footQuery);

    console.log('rewards query result length', headRes.length, bodyRes.length, footRes.length);

    const list = [...headRes, ...bodyRes, ...footRes].reduce<RewardSumMap>((map, cur) => {
      let newValue = new BigNumber(cur.amount);

      const prevValue = map.get(cur.operatorAddress);
      if (prevValue) newValue = newValue.plus(prevValue);

      map.set(cur.operatorAddress, newValue.toString());
      return map;
    }, new Map());
    console.log('reward result: ', list);

    this.rewardSumMap = list;
  }

  async waitBaseValidatorsCache() {
    do {
      const baseValidators = this.baseValidators;
      if (baseValidators) {
        return baseValidators;
      }

      await new Promise((r) => setTimeout(r, 1000));
    } while (true);
  }

  // make base validator list cache
  // per block
  async makeBaseValidatorsCache() {
    const baseValidators = await this.lcdRepo.fetchValidators();
    this.baseValidators = baseValidators;
  }

  // make response cache
  // per block
  async makeResponseCache() {
    // fetch base validators
    const baseValidators = this.baseValidators;
    // fetch voting power map
    const votingPowerMap = await this.lcdRepo.getVotingPowerMap();

    const proposals = await this.proposalService.getProposals();

    // loop base validators
    const fatResult: Array<ValidatorWithExtraData & { voteRate?: number }> = [];
    for (const v of baseValidators) {
      const { createdAt, pictureURL, contact } = await this.validatorExtraRepository.findOneOrFail({
        where: {
          operatorAddress: v.operator_address,
        },
      });

      // fetch validator's self delegation
      const self = await this.lcdRepo.fetchtSelfDelegation(v);

      const voting_power = votingPowerMap.get(v.toAmino().consensus_pubkey.value);

      const votedProposals = await this.proposalService.getVotesForValidator(v.operator_address);
      const votes: Array<ValidatorVote & { title: string }> = votedProposals.map((vote) => {
        const title = proposals.find((p) => p.proposalId === +vote.proposal_id)?.title ?? '';
        return { ...vote, title };
      });

      const proposalsAfterCreated = proposals.filter((p) => p.votingEndTime >= new Date(createdAt));

      const rewardSum = this.rewardSumMap?.get(v.operator_address) ?? '0';

      fatResult.push(
        Object.assign(v.toData(), {
          created_at: createdAt,
          number_of_proposals: proposalsAfterCreated.length,
          description: v.description.toData(), // Validator's toData does not convert description
          picture: pictureURL,
          contact,
          voting_power,
          self,
          votes,
          rewards_30d: rewardSum,
        }),
      );
    }

    const finalResult: ValidatorWithExtraData[] = fatResult.map((v) => {
      const { ...remain } = v;
      return remain;
    });

    //cache result
    this.validators = finalResult;
  }
}
