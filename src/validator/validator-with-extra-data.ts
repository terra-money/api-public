import { Validator } from '@terra-money/terra.js';

export type Contact = { email: string } & Record<string, string>;

export interface ValidatorWithExtraData extends Validator.Data {
  picture?: string;
  // https://keybase.io/_/api/1.0/user/lookup.json?key_suffix={validator.description.identity} → them[0].pictures.primary.url
  // 없으면 validator profiles

  contact?: Contact;
  // https://github.com/terra-money/validator-profiles
  // validator.security_contact

  // miss_counter?: string;
  voting_power?: string;

  self?: string;
  // (await lcd.staking.delegation(AccAddress, ValAddress)).balance.amount.toString()

  created_at?: string;

  rewards_30d?: string;

  // time_weighted_uptime?: number;
}
