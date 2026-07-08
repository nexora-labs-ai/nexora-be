import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { GroupsService } from './application/groups.service';
import { GroupsRepository } from './infrastructure/groups.repository';
import { GroupsController } from './presentation/groups.controller';

@Module({
  imports: [UsersModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService, GroupsRepository],
})
export class GroupsModule {}
