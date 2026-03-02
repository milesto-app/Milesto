import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional, IsIn } from 'class-validator';

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
