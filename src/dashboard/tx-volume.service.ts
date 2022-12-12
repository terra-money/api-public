import { Injectable } from '@nestjs/common';
import axios from 'axios';
import config from 'src/config';
import { FCDTxVolumeItem, TxVolume, TxVolumeForDenom, FCDTxVolumeRes } from './types';

@Injectable()
export class TxVolumeService {
  async getPeriodicTxVolumeForDenom(denom: string) {
    const map = await this.getTxVolume();
    const volume = map[denom];
    return volume?.periodic;
  }

  async getCumulativeTxVolumeForDenom(denom: string) {
    const map = await this.getTxVolume();
    const volume = map[denom];
    return volume?.cumulative;
  }

  private async getTxVolume() {
    const convertItem = ({ datetime, txVolume }: FCDTxVolumeItem) => {
      return { datetime, value: txVolume } as TxVolume;
    };

    const { periodic, cumulative } = await this.fetchFCDTxVolume();

    return periodic.reduce<TxVolumeForDenom>(
      (acc, { denom, data }) => ({
        ...acc,
        [denom]: {
          periodic: data.map(convertItem),
          cumulative: cumulative.find((item) => item.denom === denom)?.data.map(convertItem) ?? [],
        },
      }),
      {},
    );
  }

  private async fetchFCDTxVolume() {
    const url = config.endpoints.fcd + '/v1/dashboard/tx_volume';
    const { data } = await axios.get<FCDTxVolumeRes>(url);
    return data;
  }
}
