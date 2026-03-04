import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class GeneratedDailyObjective {
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
  @IsIn(['easy', 'moderate', 'hard'])
  public difficulty_rating?: string;
}
