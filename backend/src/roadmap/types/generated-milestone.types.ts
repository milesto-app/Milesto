import { IsBoolean, IsInt, IsString, Min } from "class-validator";

export class GeneratedMilestone {
  @IsString()
  public title!: string;

  @IsString()
  public description!: string;

  @IsString()
  public expected_outcome!: string;

  @IsBoolean()
  public is_monthly_checkpoint = false;

  @IsInt()
  @Min(1)
  public order_index!: number;
}
