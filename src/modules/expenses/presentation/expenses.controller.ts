import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExpensesService } from '../application/expenses.service';
import { CreateExpenseDto } from './create-expense.dto';
import { CurrentUser } from '../../../shared/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../shared/common/dtos/pagination-query.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Get group expenses' })
  findGroupExpenses(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.expensesService.getGroupExpenses(groupId, userId, query.page ?? 1, query.limit ?? 20);
  }

  @Post()
  @ApiOperation({ summary: 'Create an expense' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.createExpense(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.expensesService.getExpense(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete expense' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.expensesService.deleteExpense(id, userId);
  }

  @Get('group/:groupId/balance')
  @ApiOperation({ summary: 'Get group balance summary' })
  getBalance(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.expensesService.getGroupBalance(groupId, userId);
  }
}
