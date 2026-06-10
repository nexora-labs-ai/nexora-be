import { GroupRole } from '@prisma/client';
import { BusinessRuleError, ForbiddenError } from '../../../shared/common/domain-errors';

export class Group {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly currency: string,
    public readonly members: { userId: string; role: GroupRole }[],
  ) {}

  getMemberRole(userId: string): GroupRole | null {
    return this.members.find((m) => m.userId === userId)?.role ?? null;
  }

  isOwner(userId: string): boolean {
    return this.getMemberRole(userId) === GroupRole.OWNER;
  }

  isAdmin(userId: string): boolean {
    const role = this.getMemberRole(userId);
    return role === GroupRole.OWNER || role === GroupRole.ADMIN;
  }

  isMember(userId: string): boolean {
    return this.members.some((m) => m.userId === userId);
  }

  assertMember(userId: string): void {
    if (!this.isMember(userId)) {
      throw new ForbiddenError('You are not a member of this group');
    }
  }

  assertAdmin(userId: string): void {
    if (!this.isAdmin(userId)) {
      throw new ForbiddenError('You must be a group admin to perform this action');
    }
  }

  assertOwner(userId: string): void {
    if (!this.isOwner(userId)) {
      throw new ForbiddenError('Only the group owner can perform this action');
    }
  }

  assertCanAddMember(): void {
    if (this.members.length >= 50) {
      throw new BusinessRuleError('Group cannot have more than 50 members');
    }
  }
}
