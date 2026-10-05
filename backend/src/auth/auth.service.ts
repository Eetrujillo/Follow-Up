import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { dummyHash, verifyPassword } from './password';
import { PublicUser, UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.create(dto);
    const token = await this.generateToken(user);

    return {
      user,
      token,
    };
  }

  async login(dto: LoginDto) {
    const credentials = await this.users.findCredentialsByEmail(dto.email);
    const isPasswordValid = await verifyPassword(dto.password, credentials?.passwordHash ?? dummyHash);
    if (!credentials || !isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwtService.signAsync({ sub: credentials.id });
    const payload = this.jwtService.decode<{ exp?: number; iat?: number }>(accessToken);
    if (!payload || typeof payload.exp !== 'number' || typeof payload.iat !== 'number') {
      throw new UnauthorizedException('No se pudo crear la sesión');
    }

    return {
      access_token: accessToken,
      token_type: 'Bearer' as const,
      expires_in: payload.exp - payload.iat,
    };
  }

  private generateToken(user: PublicUser): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id });
  }
}
