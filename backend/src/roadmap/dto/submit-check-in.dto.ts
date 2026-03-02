import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ENERGY_LEVELS } from '../types/daily.types.js';
import type { EnergyLevel } from '../types/daily.types.js';

const NOTE_MAX_LENGTH = 1000;

export class SubmitCheckInDto {
  @ApiProperty({
    description: 'Current energy level',
    enum: [...ENERGY_LEVELS],
    example: 'good',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(ENERGY_LEVELS)
  public energy_level!: EnergyLevel;

  @ApiPropertyOptional({
    description: 'Optional free-text note about how you feel',
    example: 'Slept well, feeling motivated',
  })
  @IsOptional()
  @IsString()
  @MaxLength(NOTE_MAX_LENGTH)
  public note?: string;
}
