import config from '../config';

import { Injectable } from '@nestjs/common';
import axios, { Axios } from 'axios';

class RawRewardItem {
  rewards: string[];
  commissions: string[];

  constructor(rewards = [], commissions = []) {
    this.rewards = rewards;
    this.commissions = commissions;
  }
}

@Injectable()
export class RPCRepository {
  private rpcURL = config.endpoints.rpcCollectorList;

  private http: Axios;

  constructor() {
    this.http = axios.create({
      baseURL: this.rpcURL[0],
    });
  }

  blockResult(height: number) {
    return this.http.get('block_results', {
      params: { height },
    });
  }

  async getCommissionAndRewards(height: number): Promise<Map<string, RawRewardItem>> {
    const { data: blockResult } = await this.blockResult(height);
    const { result } = blockResult;
    const beginBlockEvents: any[] | null = result.begin_block_events;
    const endBlockEvents: any[] | null = result.end_block_events;

    const parseEventToMap = (map: Map<string, RawRewardItem>, current) => {
      if (!['rewards', 'commission'].includes(current.type) || !Array.isArray(current.attributes)) {
        return map;
      }

      const attributes: any[] = current.attributes;

      const [validator, amount] = attributes.reduce(
        (prev, current) => {
          // dmFsaWRhdG9y = base64('validator')
          // YW1vdW50 = base64('amount')
          const index = ['dmFsaWRhdG9y', 'YW1vdW50'].indexOf(current.key);

          if (index === -1) {
            return prev;
          }

          if (current.value) {
            prev[index] = Buffer.from(current.value, 'base64').toString('binary');
          }
          return prev;
        },
        [null, null],
      );

      if (amount === null) {
        return map;
      }

      if (current.type === 'rewards') {
        const record = map.get(validator) ?? new RawRewardItem();
        record.rewards.push(amount);
        map.set(validator, record);
      }

      if (current.type === 'commission') {
        const record = map.get(validator) ?? new RawRewardItem();
        record.commissions.push(amount);
        map.set(validator, record);
      }

      return map;
    };

    let map: Map<string, RawRewardItem> = new Map();
    map = beginBlockEvents?.reduce<Map<string, RawRewardItem>>(parseEventToMap, map) ?? map;
    map = endBlockEvents?.reduce<Map<string, RawRewardItem>>(parseEventToMap, map) ?? map;
    return map;
  }
}
