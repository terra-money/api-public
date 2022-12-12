import { Injectable } from '@nestjs/common';
import { createActionRuleSet, createLogMatcherForActions, getTxCanonicalMsgs } from '@terra-money/log-finder-ruleset';
import { isTxError, TxInfo } from '@terra-money/terra.js';
import axios from 'axios';
import config from 'src/config';

type OffsetParam = string | undefined;

export interface Received {
  limit: number;
  next: number;
  txs: TxInfo[];
}

const LIMIT = 3;

@Injectable()
export class TxHistoryService {
  private fetchFCD(account: string, offset: OffsetParam) {
    const url = config.endpoints.fcd + '/v1/txs';

    return axios
      .get(url, {
        params: { account, offset },
      })
      .then((r) => r.data);
  }

  getAccountTxHistory(account: string, offset: OffsetParam) {
    return this.fetchFCD(account, offset).then(this.parser);
  }

  private parse = (item: TxInfo) => {
    const { txhash, timestamp, tx, raw_log } = item;
    const { memo } = tx.body;
    const { fee } = tx.auth_info;
    const success = !isTxError(item);

    /* log-finder-ruleset */
    const ruleset = createActionRuleSet('mainnet');
    const logMatcher = createLogMatcherForActions(ruleset);
    const getCanonicalMsgs = (item: TxInfo) => {
      const matchedMsg = getTxCanonicalMsgs(item, logMatcher);
      return matchedMsg ? matchedMsg.map((matchedLog) => matchedLog.map(({ transformed }) => transformed)).flat(2) : [];
    };

    const msgs = getCanonicalMsgs(item)
      .filter((item) => item)
      .map((item) => {
        if (!item) throw new Error();
        const { payload, ...rest } = item;
        return rest;
      });

    const collapsed = Math.max(msgs.length - LIMIT, 0);

    return Object.assign(
      {
        txhash,
        timestamp: new Date(timestamp).getTime(),
        success,
        msgs: msgs.slice(0, LIMIT),
        fee: fee.amount,
      },
      collapsed && { collapsed },
      memo && { memo },
      !success && { raw_log },
    );
  };

  private parser = ({ txs, ...response }: Received) => {
    return { ...response, list: txs.map(this.parse) };
  };
}
