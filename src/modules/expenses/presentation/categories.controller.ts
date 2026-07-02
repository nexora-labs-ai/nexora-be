import { Controller, Get, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExpensesService } from '../application/expenses.service';
import { CategoryResponseDto } from './category-response.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all expense categories' })
  @ApiResponse({
    status: 200,
    type: [CategoryResponseDto],
    description: 'Returns a list of categories',
  })
  @Header('Cache-Control', 'public, max-age=86400') // Cache for 24 hours
  async findAll() {
    const categories = await this.expensesService.getCategories();
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: c.isDefault,
      createdAt: c.createdAt,
    }));
  }
}
