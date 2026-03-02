import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../common/guards/auth.guard.js';
import { CoachService } from './coach.service.js';
import type { Coach } from './coach.types.js';

@ApiTags('coaches')
@ApiBearerAuth()
@Controller('coaches')
@UseGuards(AuthGuard)
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Get()
  @ApiOperation({ summary: 'List all active coaches' })
  @ApiResponse({ status: 200, description: 'List of active coaches' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async listCoaches(): Promise<Coach[]> {
    return this.coachService.listCoaches();
  }

  @Get(':coachId')
  @ApiOperation({ summary: 'Get a single coach by ID' })
  @ApiParam({ name: 'coachId', description: 'The coach ID', type: Number })
  @ApiResponse({ status: 200, description: 'Coach returned' })
  @ApiResponse({ status: 404, description: 'Coach not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async getCoach(@Param('coachId', ParseIntPipe) coachId: number): Promise<Coach> {
    return this.coachService.getCoach(coachId);
  }
}
