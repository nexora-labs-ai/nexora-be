import { Module } from '@nestjs/common';
import { GroupsService } from './application/groups.service';
import { GroupsRepository } from './infrastructure/groups.repository';
import { GroupsController } from './presentation/groups.controller';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService],
})
export class GroupsModule {}
