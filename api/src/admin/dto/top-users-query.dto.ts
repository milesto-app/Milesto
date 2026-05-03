import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_DAYS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 365;

export class TopUsersQueryDto {
  @ApiPropertyOptional({
    minimum: MIN_LIMIT,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_LIMIT)
  @Max(MAX_LIMIT)
  public limit: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    minimum: MIN_DAYS,
    maximum: MAX_DAYS,
    default: DEFAULT_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_DAYS)
  @Max(MAX_DAYS)
  public days: number = DEFAULT_DAYS;
}
