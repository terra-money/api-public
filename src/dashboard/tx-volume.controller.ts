import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { TxVolumeService } from './tx-volume.service';

@Controller('tx-volume')
export class TxVolumeController {
  constructor(private service: TxVolumeService) {}

  @Get(':denom/periodic')
  async getPeriodicData(@Param('denom') denom: string) {
    const res = await this.service.getPeriodicTxVolumeForDenom(denom);
    if (res) return res;

    throw new NotFoundException();
  }

  @Get(':denom/cumulative')
  async getCumulativeData(@Param('denom') denom: string) {
    const res = await this.service.getCumulativeTxVolumeForDenom(denom);
    if (res) return res;

    throw new NotFoundException();
  }
}
