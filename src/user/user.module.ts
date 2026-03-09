import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';
import { userProviders } from '@/user/user.provider';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [...userProviders, UserService],
})
export class UserModule {}
