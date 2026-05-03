import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

import { DaysWindowQueryDto } from "./days-window-query.dto.js";

const MAX_FILTER_LENGTH = 200;

export class UsageDailyQueryDto extends DaysWindowQueryDto {
  @ApiPropertyOptional({
    description: "Optional generation_type filter for the daily breakdown.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_FILTER_LENGTH)
  public type?: string;
}
