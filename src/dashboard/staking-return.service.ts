import { Injectable } from '@nestjs/common';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import config from 'src/config';
import { ChartItem, FCDStakingReturnItem } from './types';

@Injectable()
export class StakingReturnService {
  async getStakingAnnualReturn() {
    const data = await this.fetchFCDStakingreturn();
    return data.map<ChartItem>(({ datetime, annualizedReturn }) => {
      return { datetime, value: new BigNumber(annualizedReturn).toString() };
    });
  }

  async getStakingDailyReturn() {
    const data = await this.fetchFCDStakingreturn();
    return data.map<ChartItem>(({ datetime, dailyReturn }) => {
      return { datetime, value: new BigNumber(dailyReturn).toString() };
    });
  }

  private async fetchFCDStakingreturn() {
    const url = config.endpoints.fcd + '/v1/dashboard/staking_return';
    const { data } = await axios.get<FCDStakingReturnItem[]>(url);
    return data;
  }
}
