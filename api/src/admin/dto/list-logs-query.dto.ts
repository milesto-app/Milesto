import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from "class-validator";

const DEFAULT_LIMIT = 100;
const MIN_LIMIT = 1;
const MAX_LIMIT = 500;
const LOG_LEVELS = ["warn", "error"] as const;

export type AdminLogLevel = (typeof LOG_LEVELS)[number];

export class ListLogsQueryDto {
  @ApiPropertyOptional({
    description: "Filter to a single log level",
    enum: LOG_LEVELS,
  })
  @IsOptional()
  @IsIn(LOG_LEVELS)
  public level?: AdminLogLevel;

  @ApiPropertyOptional({
    description: "Only return logs at or after this ISO8601 timestamp",
  })
  @IsOptional()
  @IsISO8601()
  public since?: string;

  @ApiPropertyOptional({
    description: "Maximum rows to return",
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
}
