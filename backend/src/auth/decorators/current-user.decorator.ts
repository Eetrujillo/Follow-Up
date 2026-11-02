import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { PublicUser } from '../../users/users.service';

/** Injects the user that `JwtStrategy.validate` attached to the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser =>
    context.switchToHttp().getRequest().user as PublicUser,
);
