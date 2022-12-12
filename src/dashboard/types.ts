export interface ChartItem {
  datetime: number;
  value: string;
}

// Staking Return
export interface FCDStakingReturnItem {
  datetime: number;
  dailyReturn: string;
  annualizedReturn: string;
}

export interface FCDTxVolumeItem {
  datetime: number;
  txVolume: string;
}

// Tx Volume
export interface TxVolume {
  datetime: number;
  value: string;
}

export interface TxVolumeForDenom {
  [denom: string]: { periodic: TxVolume[]; cumulative: TxVolume[] };
}

export interface FCDTxVolumeRes {
  periodic: { denom: string; data: FCDTxVolumeItem[] }[];
  cumulative: { denom: string; data: FCDTxVolumeItem[] }[];
}

// Wallets
export interface FCDAccountItem {
  datetime: number;
  value: number;
}

export interface FCDActiveAccounts {
  periodic: FCDAccountItem[];
  total: number;
}

export interface FCDRegisteredAccounts {
  periodic: FCDAccountItem[];
  cumulative: FCDAccountItem[];
  total: number;
}

export interface Accounts {
  total: ChartItem[];
  new: ChartItem[];
  active: ChartItem[];
}

export interface ActiveAccountSum {
  [key: string]: string;
}
