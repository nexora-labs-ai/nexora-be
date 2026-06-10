import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { SettlementsRepository } from './settlements.repository';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [GroupsModule],
  controllers: [SettlementsController],
  providers: [SettlementsService, SettlementsRepository],
  exports: [SettlementsService],
})
export class SettlementsModule {}
