import { BigNumber } from 'bignumber.js';

interface DenomAmount {
  denom: string;
  amount: string;
}

export function filterLuna(list: DenomAmount[]): BigNumber {
  const luna = list.find((d) => d.denom === 'uluna');
  return new BigNumber(luna ? luna.amount : 0);
}

export function sumAllDenom(list: DenomAmount[], exchangeRateMap: Record<string, string>): BigNumber {
  return list.reduce((prev, cur) => {
    const rate = cur.denom === 'uluna' ? '1' : exchangeRateMap[cur.denom];
    if (!rate) {
      return prev;
    }
    const currentValue = new BigNumber(cur.amount).div(rate);
    return prev.plus(currentValue);
  }, new BigNumber(0));
}

export function parseDenomAmountListFromText(text: string | undefined): DenomAmount[] {
  if (!text) {
    return [];
  }
  return text.split(',').reduce<DenomAmount[]>((list, c) => {
    const matched = c.match(/([\d.]+)([a-z]+)/);
    if (matched?.length === 3) {
      list.push({ denom: matched[2], amount: matched[1] });
    }
    return list;
  }, []);
}
