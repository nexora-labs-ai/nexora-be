import { Module } from '@nestjs/common';
import { GroupsController } from './presentation/groups.controller';
import { GroupsService } from './application/groups.service';
import { GroupsRepository } from './infrastructure/groups.repository';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService],
})
export class GroupsModule {}
