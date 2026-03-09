import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { UserService } from '@/user/user.service';
import { UpdateDisplayNameDto } from '@/user/dto/update-display-name.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getProfile(@Session() session: UserSession) {
    return this.userService.getProfile(session.user.id);
  }

  @Put('me')
  updateDisplayName(
    @Session() session: UserSession,
    @Body() dto: UpdateDisplayNameDto,
  ) {
    return this.userService.updateDisplayName(session.user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  deleteAccount(@Session() session: UserSession) {
    return this.userService.deleteAccount(session.user.id);
  }
}
