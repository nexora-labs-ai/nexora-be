import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { ExpensesService } from './application/expenses.service';
import { ExpensesRepository } from './infrastructure/expenses.repository';
import { ExpensesController } from './presentation/expenses.controller';

@Module({
  imports: [GroupsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository],
  exports: [ExpensesService],
})
export class ExpensesModule {}
