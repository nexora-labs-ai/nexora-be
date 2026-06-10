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

export const GROUP_EVENTS = {
  CREATED: 'group.created',
  MEMBER_ADDED: 'group.member.added',
  MEMBER_REMOVED: 'group.member.removed',
} as const;
