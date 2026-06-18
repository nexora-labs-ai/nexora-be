import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/auth.decorators';
import { ForbiddenError } from '../domain-errors';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user?.permissions) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const hasPermission = requiredPermissions.every((p) => user.permissions.includes(p));

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return true;
  }
}
