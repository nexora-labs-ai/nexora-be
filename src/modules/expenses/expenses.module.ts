import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { GroupsModule } from '../groups/groups.module';
import { ExpensesService } from './application/expenses.service';
import { ExpensesRepository } from './infrastructure/expenses.repository';
import { CategoriesController } from './presentation/categories.controller';
import { ExpensesController } from './presentation/expenses.controller';

@Module({
  imports: [GroupsModule, AiModule],
  controllers: [ExpensesController, CategoriesController],
  providers: [ExpensesService, ExpensesRepository],
  exports: [ExpensesService],
})
export class ExpensesModule {}
