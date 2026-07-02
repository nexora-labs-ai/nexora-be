import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GroupRole } from '@prisma/client';
import { ForbiddenError } from '../../../../shared/common/domain-errors';
import { GroupsRepository } from '../../infrastructure/groups.repository';
import { GROUP_ROLE_KEY } from './group-role.decorator';

@Injectable()
export class GroupRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly groupsRepository: GroupsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<GroupRole>(GROUP_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const groupId =
      request.params.id || request.params.groupId || request.query.groupId || request.body?.groupId;

    if (!user || !user.id) {
      throw new ForbiddenError('User not authenticated');
    }

    if (!groupId) {
      throw new ForbiddenError('Group ID is required to verify role');
    }

    const group = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!group) {
      throw new ForbiddenError('Group not found or you do not have access');
    }

    const member = group.members.find((m) => m.userId === user.id);
    if (!member) {
      throw new ForbiddenError('You are not a member of this group');
    }

    if (requiredRole === GroupRole.OWNER && member.role !== GroupRole.OWNER) {
      throw new ForbiddenError('You must be a group owner to perform this action');
    }

    return true;
  }
}
