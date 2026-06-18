import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { SettlementsController } from './settlements.controller';
import { SettlementsRepository } from './settlements.repository';
import { SettlementsService } from './settlements.service';

@Module({
  imports: [GroupsModule],
  controllers: [SettlementsController],
  providers: [SettlementsService, SettlementsRepository],
  exports: [SettlementsService],
})
export class SettlementsModule {}
