import config from '../config';
import { createConnection } from 'typeorm';
import { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions';
import { LCDRepository } from '../repository/lcd.repository';
import { RPCRepository } from '../repository/rpc.repository';
import apiEntities, { BlockTime, CirculatingSupply, Proposal, RewardCommission, ValidatorExtra } from '../entity';

import { RewardCollector } from './reward.collector';
import { CirculatingSupplyCollector } from './circulating-supply.collector';
import { ProposalVoteCollector } from './proposal-vote.collector';
import { ValidatorExtraCollector } from './validator-extra.collector';
import { ExternalRepository } from '../repository/external.repository';

enum CollectorType {
  All = 'all',
  CirculatingSupply = 'circulating-supply',
  ValidatorExtra = 'validator-extra',
  ProposalVote = 'proposal-vote',
  Reward = 'reward',
}

const init = async () => {
  const collector = process.argv[2] as CollectorType;
  if (!collector) {
    console.error('no collector specified');
    process.exit(1);
  }

  const option = config.orm.api as PostgresConnectionCredentialsOptions;

  const connection = await createConnection({
    type: 'postgres',
    ...option,
    entities: apiEntities,
  });

  const lcdRepo = new LCDRepository();
  const rpcRepo = new RPCRepository();
  const extRepo = new ExternalRepository();

  const rewardCommissionRepo = connection.getRepository(RewardCommission);
  const blockTimeRepo = connection.getRepository(BlockTime);
  const circulatingSupplyRepo = connection.getRepository(CirculatingSupply);
  const proposalRepo = connection.getRepository(Proposal);
  const validatorExtraRepo = connection.getRepository(ValidatorExtra);

  if (collector === CollectorType.CirculatingSupply || collector === CollectorType.All) {
    new CirculatingSupplyCollector(circulatingSupplyRepo, lcdRepo);
  }
  if (collector === CollectorType.ValidatorExtra || collector === CollectorType.All) {
    new ValidatorExtraCollector(extRepo, lcdRepo, validatorExtraRepo);
  }
  if (collector === CollectorType.ProposalVote || collector === CollectorType.All) {
    new ProposalVoteCollector(lcdRepo, proposalRepo, connection);
  }
  if (collector === CollectorType.Reward || collector === CollectorType.All) {
    new RewardCollector(rewardCommissionRepo, blockTimeRepo, connection, lcdRepo, rpcRepo);
  }
};

init().catch(console.error);
