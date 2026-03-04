import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export class ListMessagesQueryDto {
  @ApiPropertyOptional({
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
    description: 'Number of messages to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  public limit: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Cursor: return messages before this ISO8601 timestamp',
  })
  @IsOptional()
  @IsISO8601()
  public before?: string;
}
