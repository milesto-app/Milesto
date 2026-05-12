import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from "class-validator";

const ESTIMATED_MINUTES_MAX = 600;

export class GeneratedTask {
  @IsString()
  @IsNotEmpty()
  public title!: string;

  @IsString()
  @IsNotEmpty()
  public description!: string;

  @IsInt()
  @IsPositive()
  public order_index!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(ESTIMATED_MINUTES_MAX)
  public estimated_minutes?: number;
}
