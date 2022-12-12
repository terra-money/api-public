import { NestFactory } from '@nestjs/core';
import { BigNumber } from 'bignumber.js';
import { AppModule } from './app.module';
import { validateConfig } from './config';

BigNumber.config({ EXPONENTIAL_AT: 1e9 });

async function bootstrap() {
  if (!validateConfig()) {
    console.error('configuration was set wrong');
    process.exit(1);
  }
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
