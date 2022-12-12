import { Injectable } from '@nestjs/common';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { startOfToday, format, subDays } from 'date-fns';
import { Connection } from 'typeorm';
import { ActiveAccountSum, FCDActiveAccounts, FCDRegisteredAccounts, Accounts, FCDAccountItem } from './types';
import * as nodeCron from 'node-cron';
import config from 'src/config';
import { InjectConnection } from '@nestjs/typeorm';

const activeAccountSumPeriod = [7, 14, 30];

@Injectable()
export class WalletsService {
  constructor(
    @InjectConnection('fcd')
    private connection: Connection,
  ) {
    this.fetchActiveAccountSum(activeAccountSumPeriod).catch((err) => {
      console.error(err);
    });

    nodeCron.schedule('0 20 0 * * *', () => {
      this.fetchActiveAccountSum(activeAccountSumPeriod).catch((err) => {
        console.error(err);
      });
    });
  }

  private activeAccSumResult: ActiveAccountSum;
  private pendingActiveAccSumDate: Date | undefined;
  private pendingActiveAccSumResult: ActiveAccountSum | undefined;

  async getNewAccounts() {
    const fcdResult = await this.fetchFCDAccounts();
    return fcdResult.new;
  }
  async getTotalAccounts() {
    const fcdResult = await this.fetchFCDAccounts();
    return fcdResult.total;
  }

  async getActiveAccounts() {
    const fcdResult = await this.fetchFCDAccounts();
    return fcdResult.active;
  }

  async activeAccountSum() {
    await this.fetchFCDAndEnableActiveAccountSum();
    return this.activeAccSumResult;
  }

  private async fetchActiveAccountSum(periodList: number[]) {
    console.log('querying active account sum...');
    console.time('querying active account sum...');
    periodList = periodList.sort((a, b) => a - b);

    const today = startOfToday();
    const from = format(subDays(today, periodList.at(-1) ?? 0), 'yyyy-MM-dd HH:mm:ss');
    const to = format(today, 'yyyy-MM-dd HH:mm:ss');

    // EXP: we are using count (SELECT DISTINCT account FROM x) rather COUNT(DISTINCT account) because its is 10 times faster.
    // const subQuery = `SELECT DISTINCT account FROM account_tx WHERE timestamp < '${to}' and timestamp >= '${from}'`;
    // const rawQuery = `SELECT COUNT(*) AS active_account_count FROM (${subQuery}) AS t`;
    const subQuery = `SELECT account, DATE(MAX(timestamp)) AS last_date FROM account_tx 
    WHERE timestamp < '${to}' and timestamp >= '${from}' GROUP BY account`;

    const rawQuery = `SELECT COUNT(*) AS distinct_active_account_count, t.last_date AS date
    FROM (${subQuery}) AS t
    GROUP BY t.last_date ORDER BY t.last_date DESC`;

    const result: any[] = await this.connection.query(rawQuery);

    this.pendingActiveAccSumDate = today;
    this.pendingActiveAccSumResult = result
      .reduce<BigNumber[]>(
        (prev, cur, index) => {
          return prev.map((v, i) => {
            if (index < periodList[i]) {
              return v.plus(cur.distinct_active_account_count);
            }
            return v;
          });
        },
        Array.from({ length: periodList.length }, () => new BigNumber(0)),
      )
      .reduce((map, cur, index) => {
        map[periodList[index]] = cur.toString();
        return map;
      }, {});
    console.timeEnd('querying active account sum...');
  }

  private async fetchFCDAccounts() {
    const activeAccountsPath = config.endpoints.fcd + '/v1/dashboard/active_accounts';
    const registeredAccountsPath = config.endpoints.fcd + '/v1/dashboard/registered_accounts';

    const [active, registered] = await Promise.all([
      axios.get(activeAccountsPath).then((r) => r.data),
      axios.get(registeredAccountsPath).then((r) => r.data),
    ]);

    return this.parseAccounts(active, registered);
  }

  private async fetchFCDAndEnableActiveAccountSum() {
    const fcdResult = await this.fetchFCDAccounts();
    if (!this.pendingActiveAccSumDate || !this.pendingActiveAccSumResult) return fcdResult;

    const lastTotalData = fcdResult.total.at(-1);
    if (lastTotalData) {
      if (!this.activeAccSumResult || this.pendingActiveAccSumDate.getTime() === lastTotalData.datetime) {
        // don't need to query total active accounts
        // same as total cumulative number
        const total = lastTotalData.value;

        this.activeAccSumResult = { '0': total, ...this.pendingActiveAccSumResult };
        this.pendingActiveAccSumResult = undefined;
        this.pendingActiveAccSumDate = undefined;
      }
    }

    return fcdResult;
  }

  private parseAccounts = (
    { total: totalActive, ...active }: FCDActiveAccounts,
    { total: totalRegistered, ...registered }: FCDRegisteredAccounts,
  ): Accounts => {
    const stringifyValues = (data: FCDAccountItem[]) =>
      data.map(({ datetime, value }) => ({ datetime, value: String(value) }));

    return {
      total: stringifyValues(registered.cumulative),
      new: stringifyValues(registered.periodic),
      active: stringifyValues(active.periodic),
    };
  };
}
