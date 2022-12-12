import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ValidatorService } from './validator.service';

@Controller('validators?')
export class ValidatorController {
  constructor(private validatorService: ValidatorService) {}

  @Get(':validatorAddr')
  async getOneValidator(@Param('validatorAddr') addr: string) {
    const validator = this.validatorService.getValidator(addr);

    if (validator) {
      return validator;
    }

    throw new NotFoundException();
  }

  @Get()
  getAllValidators() {
    return this.validatorService.getValidators();
  }
}
