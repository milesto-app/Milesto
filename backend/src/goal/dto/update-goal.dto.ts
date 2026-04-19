import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

const MAX_MOTIVATION_LENGTH = 1_000;

export class UpdateGoalDto {
  @ApiPropertyOptional({
    example: "I want my kids to see me finish something hard.",
    description:
      "Free-text user 'why' captured during onboarding. Quoted verbatim by coach-voiced pushes.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_MOTIVATION_LENGTH)
  public user_motivation_quote?: string;
}
