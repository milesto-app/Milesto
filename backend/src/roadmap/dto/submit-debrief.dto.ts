import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

const DEBRIEF_NOTE_MAX_LENGTH = 5000;

export class TaskRatingDto {
  @ApiProperty({ description: 'Daily objective ID', example: 'uuid-here' })
  @IsUUID()
  public objective_id!: string;

  @ApiProperty({
    description: 'Difficulty rating',
    enum: ['easy', 'moderate', 'hard'],
    example: 'moderate',
  })
  @IsString()
  @IsIn(['easy', 'moderate', 'hard'])
  public rating!: string;
}

export class SubmitDebriefDto {
  @ApiProperty({
    description: 'Free-text reflection on the day',
    example:
      'Today was productive. The writing task took longer than expected.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEBRIEF_NOTE_MAX_LENGTH)
  public note!: string;

  @ApiPropertyOptional({
    description: 'Per-task difficulty ratings',
    type: [TaskRatingDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskRatingDto)
  public task_ratings?: TaskRatingDto[];
}
