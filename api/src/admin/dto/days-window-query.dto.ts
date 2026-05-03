import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

const DEFAULT_DAYS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 365;

export class DaysWindowQueryDto {
  @ApiPropertyOptional({
    description: "Trailing window size in days (inclusive of today)",
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
