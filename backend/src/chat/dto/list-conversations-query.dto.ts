import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export class ListConversationsQueryDto {
  @ApiPropertyOptional({
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
    description: 'Number of conversations to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  public limit: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    description: 'Number of conversations to skip',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public offset: number = 0;

  @ApiPropertyOptional({ description: 'Filter by goal ID' })
  @IsOptional()
  @IsUUID()
  public goalId?: string;
}
