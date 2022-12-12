import config from '../config';

import { Injectable } from '@nestjs/common';
import {
  AccAddress,
  BlockInfo,
  DelegateValidator,
  LCDClient,
  MsgVote,
  MsgVoteWeighted,
  TxInfo,
  Validator,
  Vote,
  WeightedVoteOption,
} from '@terra-money/terra.js';
import { Pagination, PaginationOptions } from '@terra-money/terra.js/dist/client/lcd/APIRequester';
import { WebSocketClient } from '@terra-money/terra.js';
import axios, { Axios } from 'axios';

@Injectable()
export class LCDRepository {
  private wsURL = config.endpoints.websocketList;
  private lcdURL = config.endpoints.lcdCollectorList;

  lcd: LCDClient;

  private http: Axios;

  private wsConnIndex = 0;
  private mantleIndex = 0;
  private newBlockSubscribers: { (block: { value: BlockInfo }): void }[] = [];

  constructor() {
    this.lcd = new LCDClient({
      URL: this.lcdURL[0],
      chainID: 'mainnet',
    });

    this.http = axios.create({
      baseURL: this.lcdURL[0],
    });

    this.connectWebSocket(0, this.onBlock.bind(this));
  }

  currentMantleURL() {
    const { mantleList } = config.endpoints;
    if (mantleList.length === 1) return mantleList[0];

    const index = this.mantleIndex++;
    if (this.mantleIndex >= mantleList.length) {
      this.mantleIndex = 0;
    }
    return mantleList[index];
  }

  subscribeNewBlock(fn: (block: { value: BlockInfo }) => void) {
    this.newBlockSubscribers.push(fn);
  }

  private onBlock(block) {
    this.newBlockSubscribers.forEach((fn) => fn(block));
  }

  async block(height?: number): Promise<BlockInfo> {
    return this.lcd.tendermint.blockInfo(height);
  }

  async currentBlock(): Promise<BlockInfo> {
    return this.block();
  }

  async blockTimeForHeight(height: number) {
    const info = await this.lcd.tendermint.blockInfo(height);
    return info.block.header.time;
  }

  async checkValidateExist(height: number, addr: string): Promise<boolean> {
    const url = `${this.currentMantleURL()}/cosmos/staking/v1beta1/validators/${addr}?height=${height}`;

    try {
      const res = await axios.get(url);
      if (res.status === 200) return true;
      if (res.status === 404) return false;
      throw 'wrong status';
    } catch (err) {
      if (err.response?.status === 404) return false;
      throw err;
    }
  }

  private connectWebSocket(rpcIndex: number, onBlock: (block) => void) {
    const wsClient = new WebSocketClient(this.wsURL[rpcIndex]);
    wsClient.start();

    wsClient.subscribe('NewBlock', {}, onBlock);

    wsClient.on('destroyed', () => {
      console.log('disconnected');
      this.wsConnIndex += 1;

      if (this.wsConnIndex >= this.wsURL.length) {
        this.wsConnIndex = 0;
      }

      setTimeout(() => {
        this.connectWebSocket(this.wsConnIndex, onBlock);
      }, 1000);
    });
  }

  async fetchValidators(): Promise<Validator[]> {
    return this.gatherPagedResultWithKey<Validator.Data>((option) =>
      this.http
        .get('cosmos/staking/v1beta1/validators', {
          params: option,
        })
        .then((res) => [res.data.validators, res.data.pagination]),
    ).then((validators) => validators.map(Validator.fromData));
  }

  async getProposals() {
    return this.gatherPagedResultWithKey((option) => {
      return this.lcd.gov.proposals(option);
    });
  }

  async getCurrentProposalVotes(proposal_id: string): Promise<Record<string, WeightedVoteOption.Data[]>> {
    return this.gatherPagedResultWithKey<Vote>((params) => {
      return this.http
        .get(`cosmos/gov/v1beta1/proposals/${proposal_id}/votes`, {
          params,
        })
        .then((res) => [res.data.votes.map(Vote.fromData), res.data.pagination]);
    }).then((votes) => {
      return votes.reduce<Record<string, WeightedVoteOption.Data[]>>((prev, cur) => {
        if (!prev[cur.voter]) {
          prev[cur.voter] = [];
        }
        prev[cur.voter].push(...cur.options.map((o) => o.toData()));
        return prev;
      }, {});
    });
  }

  async getProposalVotes(proposal_id: string): Promise<Record<string, WeightedVoteOption.Data[]>> {
    let result: TxInfo[] = [];

    const events = [
      {
        key: 'proposal_vote.proposal_id',
        value: proposal_id,
      },
    ];

    result = await this.gatherPagedResult((params) => {
      return this.lcd.tx
        .search({
          ...params,
          events,
        })
        .then(async (r) => {
          await new Promise((r) => setTimeout(r, 200));
          return [r.txs, r.pagination];
        });
    });

    return result.reduce<Record<string, WeightedVoteOption.Data[]>>((prev, cur) => {
      cur.tx.body.messages.map((msg) => {
        let m: MsgVoteWeighted | MsgVote | undefined;
        let items: WeightedVoteOption.Data[];
        if (msg instanceof MsgVote) {
          m = msg as MsgVote;
          items = [new WeightedVoteOption(m.option, 1).toData()];
        } else if (msg instanceof MsgVoteWeighted) {
          m = msg as MsgVoteWeighted;
          items = m.options.map((o) => o.toData());
        } else {
          return;
        }

        prev[m.voter] = items;
      });
      return prev;
    }, {});
  }

  private async gatherPagedResultWithKey<T>(
    pagedAPI: (option: Partial<PaginationOptions>) => Promise<[T[], Pagination]>,
    limit = 100,
  ): Promise<T[]> {
    const result: T[] = [];
    let nextKey: string | null = null;
    do {
      const option = {
        'pagination.limit': limit,
        'pagination.key': nextKey ?? undefined,
      };

      const set = await pagedAPI(option);

      result.push(...set[0]);
      nextKey = set[1].next_key;
    } while (nextKey);

    return result;
  }

  private async gatherPagedResult<T>(
    pagedAPI: (option: Partial<PaginationOptions>) => Promise<[T[], Pagination]>,
    limit = 100,
  ): Promise<T[]> {
    const result: T[] = [];
    let total = 0;
    let offset: number | null = null;
    do {
      const option = {};
      if (limit) option['pagination.limit'] = limit.toString();
      if (offset) option['pagination.offset'] = offset.toString();

      const set = await pagedAPI(option);

      result.push(...set[0]);
      offset = result.length;
      total = set[1].total;
    } while (result.length < total);

    return result;
  }

  // voting power
  private async fetchValidatorSets(): Promise<DelegateValidator[]> {
    const validators = await this.gatherPagedResult((option) => this.lcd.tendermint.validatorSet(undefined, option));
    return validators;
  }

  async getVotingPowerMap() {
    const d = await this.fetchValidatorSets();
    const dd = d.reduce<Map<string, string>>((prev, current) => {
      prev.set(current.pub_key.key, current.voting_power);
      return prev;
    }, new Map());

    return dd;
  }

  //self-delegation
  async fetchtSelfDelegation(validator: Validator): Promise<string | undefined> {
    const delegator = AccAddress.fromValAddress(validator.operator_address);

    try {
      const delegation = await this.lcd.staking.delegation(delegator, validator.operator_address);
      return delegation.balance.amount.toString();
    } catch (err) {
      if (err.response?.status === 404) {
        return '0';
      }

      //TODO: error handling
      return undefined;
    }
  }

  async fetchValidatorTokenMap(height: number): Promise<{
    [key: string]: string;
  }> {
    const url = `${this.currentMantleURL()}/cosmos/staking/v1beta1/validators?height=${height}`;

    const data = await this.gatherPagedResultWithKey<Validator.Data>(async (option) => {
      const { data } = await axios.get(url, {
        params: option,
      });

      return [data.validators, data.pagination];
    });

    return data.reduce((map, v) => {
      map[v.operator_address] = v.tokens;
      return map;
    }, {});
  }

  async fetchCirculatingSupply(): Promise<string> {
    const url = `${this.currentMantleURL()}/export/circulating_supply`;
    const { data } = await axios.get(url);
    return data;
  }
}
