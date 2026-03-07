import { Module } from '@nestjs/common';
import { AlquranService } from './alquran.service';

@Module({
  providers: [AlquranService],
  exports: [AlquranService],
})
export class AlquranModule {}
