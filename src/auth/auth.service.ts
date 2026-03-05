import { Injectable } from '@nestjs/common';
import { auth, Auth } from '@/auth/auth';

@Injectable()
export class AuthService {
  public readonly auth: Auth = auth;
}
