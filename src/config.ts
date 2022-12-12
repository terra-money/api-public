import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

const config = {
  orm: {
    api: {
      type: 'postgres',
      host: process.env.API_DB_HOST,
      port: process.env.API_DB_PORT,
      username: process.env.API_DB_USERNAME,
      password: process.env.API_DB_PASSWORD,
      database: process.env.API_DB_DATABASE,
      synchronize: process.env.API_DB_SYNCHRONIZE === 'true',
    } as PostgresConnectionOptions,
    fcd: {
      type: 'postgres',
      host: process.env.FCD_DB_HOST,
      port: process.env.FCD_DB_PORT,
      username: process.env.FCD_DB_USERNAME,
      password: process.env.FCD_DB_PASSWORD,
      database: process.env.FCD_DB_DATABASE,
    } as PostgresConnectionOptions,
  },
  startBlock: Number(process.env.START_BLOCK) || 1,
  reward: {
    collectWindow: Number(process.env.REWARD_COLLECT_WINDOW) || 30,
    stopCollectOnCollision: process.env.REWARD_COLLECT_STOP_COLLECT_ON_COLLISION === 'true',
  },
  circulatingsupply: {
    collectWindowBlocks: Number(process.env.CIRCULATING_SUPPLY_COLLECT_WINDOW_BLOCKS) || 1000,
  },
  endpoints: {
    fcd: process.env.FCD_URL,
    lcdCollectorList: process.env.LCD_COLLECTOR_ENDPOINTS?.split(',') || [],
    rpcCollectorList: process.env.RPC_COLLECTOR_ENDPOINTS?.split(',') || [],
    websocketList: process.env.WS_ENDPOINTS?.split(',') || [],
    mantleList: process.env.MANTLE_ENDPOINTS?.split(',') || [],
  },
};

export const validateConfig = () => {
  const { endpoints } = config;

  if (!endpoints.fcd) return false;
  if (endpoints.lcdCollectorList.length === 0) return false;
  if (endpoints.rpcCollectorList.length === 0) return false;
  if (endpoints.websocketList.length === 0) return false;
  if (endpoints.mantleList.length === 0) return false;

  return true;
};

export default config;
