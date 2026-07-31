import { SetMetadata } from '@nestjs/common';
import { GroupRole } from '@prisma/client';

export const GROUP_ROLE_KEY = 'group_role';
export const RequireGroupRole = (role: GroupRole) => SetMetadata(GROUP_ROLE_KEY, role);
