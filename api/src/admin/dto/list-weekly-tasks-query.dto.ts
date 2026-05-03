import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

const MIN_WEEK_INDEX = 1;

export class ListWeeklyTasksQueryDto {
  @ApiPropertyOptional({
    description: "Filter to a single week by week_number (1-based)",
    minimum: MIN_WEEK_INDEX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_WEEK_INDEX)
  public weekIndex?: number;
}
