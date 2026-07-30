import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/common/decorators/current-user.decorator';
import { ExpensesService } from '../application/expenses.service';
import { CreateExpenseDto } from './create-expense.dto';
import { GetGroupExpensesDto } from './get-group-expenses.dto';
import { UpdateExpenseDto } from './update-expense.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Get group expenses' })
  findGroupExpenses(@Query() query: GetGroupExpensesDto, @CurrentUser('id') userId: string) {
    return this.expensesService.getGroupExpenses(
      query.groupId,
      userId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create an expense' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.createExpense(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.expensesService.getExpense(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update expense' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.updateExpense(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete expense' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.expensesService.deleteExpense(id, userId);
  }

  @Get('group/:groupId/balance')
  @ApiOperation({ summary: 'Get group balance summary' })
  getBalance(@Param('groupId', ParseUUIDPipe) groupId: string, @CurrentUser('id') userId: string) {
    return this.expensesService.getGroupBalance(groupId, userId);
  }

  @Post('analyze-receipt')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Analyze receipt image to extract data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  analyzeReceipt(@UploadedFile() file: Express.Multer.File) {
    return this.expensesService.analyzeReceipt(file);
  }

  @Post('upload-receipt')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload receipt image as evidence' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadReceipt(@UploadedFile() file: Express.Multer.File) {
    return this.expensesService.uploadReceiptEvidence(file);
  }
}
