import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const DAY_OF_WEEK_MIN = 0;
const DAY_OF_WEEK_MAX = 6;
const LOCAL_HOUR_MIN = 0;
const LOCAL_HOUR_MAX = 23;
const LOCATION_MAX_LENGTH = 120;

export class UpsertIntentionDto {
  @ApiProperty({ description: "Weekly task UUID" })
  @IsUUID()
  public task_id!: string;

  @ApiProperty({
    description: "0=Sunday, 1=Monday, ..., 6=Saturday",
    minimum: DAY_OF_WEEK_MIN,
    maximum: DAY_OF_WEEK_MAX,
  })
  @IsInt()
  @Min(DAY_OF_WEEK_MIN)
  @Max(DAY_OF_WEEK_MAX)
  public day_of_week!: number;

  @ApiProperty({
    description: "Local hour 0-23",
    minimum: LOCAL_HOUR_MIN,
    maximum: LOCAL_HOUR_MAX,
  })
  @IsInt()
  @Min(LOCAL_HOUR_MIN)
  @Max(LOCAL_HOUR_MAX)
  public local_hour!: number;

  @ApiPropertyOptional({ description: "Optional free-text location label" })
  @IsOptional()
  @IsString()
  @MaxLength(LOCATION_MAX_LENGTH)
  public location_label?: string;
}
