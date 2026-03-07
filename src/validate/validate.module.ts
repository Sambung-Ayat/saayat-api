import { Module } from '@nestjs/common';
import { ValidateController } from './validate.controller';
import { ValidateService } from './validate.service';
import { AlquranModule } from '@/alquran/alquran.module';

@Module({
  imports: [AlquranModule],
  controllers: [ValidateController],
  providers: [ValidateService],
})
export class ValidateModule {}
