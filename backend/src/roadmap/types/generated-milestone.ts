import { IsInt, IsString, Min } from 'class-validator';

export class GeneratedMilestone {
  @IsString()
  public title!: string;

  @IsString()
  public description!: string;

  @IsString()
  public expected_outcome!: string;

  @IsInt()
  @Min(1)
  public target_month!: number;

  @IsInt()
  @Min(1)
  public order_index!: number;
}
