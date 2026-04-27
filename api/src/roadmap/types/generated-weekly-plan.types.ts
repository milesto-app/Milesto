import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class GeneratedWeeklyPlan {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  public objectives!: string[];
}
