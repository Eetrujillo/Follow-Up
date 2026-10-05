import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { isUUID } from 'class-validator';
import { UsersService } from '../../users/users.service';
import { jwtOptions } from '../auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(UsersService) private readonly users: UsersService) {
    const options = jwtOptions();
    const secret = options.secret;

    if (typeof secret !== 'string') {
      throw new Error('JWT_SECRET debe ser un string válido');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: { sub?: unknown; exp?: unknown }) {
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub) || typeof payload.exp !== 'number') {
      throw new UnauthorizedException('Token inválido');
    }

    try {
      return await this.users.findOne(payload.sub);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('Usuario no autorizado');
      }
      throw error;
    }
  }
}
