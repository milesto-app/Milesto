import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Database } from '../supabase/database.types.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UserId } from '../common/decorators/user.decorator.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto.js';
import { GoalService } from './goal.service.js';

type GoalRow = Database['public']['Tables']['goals']['Row'];

interface GoalListResult {
  data: GoalRow[];
  total: number;
  limit: number;
  offset: number;
}

type GoalProfileResult = Pick<
  Database['public']['Tables']['goal_profiles']['Row'],
  'id' | 'goal_id' | 'profile_data' | 'narrative_summary' | 'created_at'
>;

@ApiTags('Goals')
@ApiBearerAuth()
@Controller('goals')
@UseGuards(AuthGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new goal' })
  @ApiResponse({ status: 201, description: 'Goal created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async create(@UserId() userId: string, @Body() dto: CreateGoalDto): Promise<GoalRow> {
    return this.goalService.create(userId, dto.description, dto.title);
  }

  @Get()
  @ApiOperation({ summary: 'List all goals for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated list of goals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async findAll(
    @UserId() userId: string,
    @Query() query: ListGoalsQueryDto,
  ): Promise<GoalListResult> {
    return this.goalService.findAll(userId, query.limit, query.offset);
  }

  @Get(':goalId/profile')
  @ApiOperation({ summary: 'Get the AI-generated goal profile' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 200, description: 'Goal profile returned' })
  @ApiResponse({ status: 404, description: 'Goal not found or intake not complete' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async getGoalProfile(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ): Promise<GoalProfileResult> {
    return this.goalService.getGoalProfile(userId, goalId);
  }

  @Get(':goalId')
  @ApiOperation({ summary: 'Get a single goal by ID' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 200, description: 'Goal returned' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async findOne(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ): Promise<GoalRow> {
    return this.goalService.findOne(userId, goalId);
  }

  @Delete(':goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a goal (restricted by status)' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 204, description: 'Goal deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete goal in current status' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async delete(@UserId() userId: string, @Param('goalId') goalId: string): Promise<void> {
    await this.goalService.delete(userId, goalId);
  }
}
