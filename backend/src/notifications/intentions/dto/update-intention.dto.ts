import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const DAY_OF_WEEK_MIN = 0;
const DAY_OF_WEEK_MAX = 6;
const LOCAL_HOUR_MIN = 0;
const LOCAL_HOUR_MAX = 23;
const LOCATION_MAX_LENGTH = 120;

export class UpdateIntentionDto {
  @ApiPropertyOptional({
    minimum: DAY_OF_WEEK_MIN,
    maximum: DAY_OF_WEEK_MAX,
  })
  @IsOptional()
  @IsInt()
  @Min(DAY_OF_WEEK_MIN)
  @Max(DAY_OF_WEEK_MAX)
  public day_of_week?: number;

  @ApiPropertyOptional({
    minimum: LOCAL_HOUR_MIN,
    maximum: LOCAL_HOUR_MAX,
  })
  @IsOptional()
  @IsInt()
  @Min(LOCAL_HOUR_MIN)
  @Max(LOCAL_HOUR_MAX)
  public local_hour?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(LOCATION_MAX_LENGTH)
  public location_label?: string | null;
}
