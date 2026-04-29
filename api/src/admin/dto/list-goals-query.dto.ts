import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MIN_PAGE = 1;
const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 100;
const MAX_FILTER_LENGTH = 100;

export class ListGoalsQueryDto {
  @ApiPropertyOptional({ minimum: MIN_PAGE, default: DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_PAGE)
  public page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: MIN_PER_PAGE,
    maximum: MAX_PER_PAGE,
    default: DEFAULT_PER_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_PER_PAGE)
  @Max(MAX_PER_PAGE)
  public perPage: number = DEFAULT_PER_PAGE;

  @ApiPropertyOptional({ description: "Filter by goal status" })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_FILTER_LENGTH)
  public status?: string;

  @ApiPropertyOptional({ description: "Filter by goal owner UUID" })
  @IsOptional()
  @IsUUID()
  public userId?: string;
}
