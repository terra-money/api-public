import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Contact } from 'src/validator/validator-with-extra-data';

@Injectable()
export class ExternalRepository {
  async getValidatorProfile(operator_address: string): Promise<Contact | null> {
    const url = `https://raw.githubusercontent.com/terra-money/validator-profiles/master/validators/${operator_address}/profile.json`;
    try {
      const { data } = await axios.get(url);
      return data.contact;
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(err);
      }
      return null;
    }
  }

  async getValidatorPicture(identity: string): Promise<string | null> {
    const { data } = await axios.get(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}`);

    //TODO: handle error
    if (data.them) {
      return data.them[0]?.pictures?.primary?.url;
    }

    return null;
  }
}
