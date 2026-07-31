export class GroupCreatedEvent {
  constructor(
    public readonly groupId: string,
    public readonly createdBy: string,
    public readonly groupName: string,
  ) {}
}

export class MemberAddedEvent {
  constructor(
    public readonly groupId: string,
    public readonly addedUserId: string,
    public readonly addedBy: string,
  ) {}
}

export class MemberRemovedEvent {
  constructor(
    public readonly groupId: string,
    public readonly removedUserId: string,
    public readonly removedBy: string,
  ) {}
}

export class GroupInvitedEvent {
  constructor(
    public readonly groupId: string,
    public readonly targetUserId: string,
    public readonly inviterId: string,
    public readonly token: string,
    public readonly groupName: string,
    public readonly inviterEmail: string,
  ) {}
}

export class GroupInvitationRespondedEvent {
  constructor(
    public readonly token: string,
    public readonly status: 'ACCEPTED' | 'REJECTED',
    public readonly userId: string,
  ) {}
}

export const GROUP_EVENTS = {
  CREATED: 'group.created',
  MEMBER_ADDED: 'group.member.added',
  MEMBER_REMOVED: 'group.member.removed',
  INVITED: 'group.invited',
  INVITATION_RESPONDED: 'group.invitation.responded',
} as const;
