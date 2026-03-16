import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const DEBRIEF_NOTE_MAX_LENGTH = 5000;

export class TaskRatingDto {
  @ApiProperty({ description: 'Weekly task ID', example: 'uuid-here' })
  @IsUUID()
  public task_id!: string;

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
    description: 'Weekly plan ID for this debrief',
    example: 'uuid-here',
  })
  @IsUUID()
  public weekly_plan_id!: string;

  @ApiProperty({
    description: 'Free-text reflection on the week',
    example:
      'This week was productive. The writing tasks took longer than expected.',
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
