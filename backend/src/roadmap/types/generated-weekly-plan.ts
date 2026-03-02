import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class GeneratedWeeklyPlan {
  @IsString()
  @IsNotEmpty()
  public focus!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  public objectives!: string[];
}
