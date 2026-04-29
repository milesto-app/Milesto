import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MIN_PAGE = 1;
const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 100;

export class ListBatchesQueryDto {
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

  @ApiPropertyOptional({ description: "Filter by goal UUID" })
  @IsOptional()
  @IsUUID()
  public goalId?: string;
}
