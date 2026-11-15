import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * The user that `JwtStrategy.validate` resolved from the verified bearer token.
 * Controllers use this instead of trusting anything the client sends, which is
 * the whole point: the token decides whose rows are touched.
 */
export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  createdAt: Date;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
