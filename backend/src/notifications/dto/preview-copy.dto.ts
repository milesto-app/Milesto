import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

const COACH_ID_MIN = 1;
const COACH_ID_MAX = 4;

export class PreviewCopyDto {
  @ApiProperty({ description: "Notification kind identifier" })
  @IsDefined()
  @IsString()
  public kind!: string;

  @ApiProperty({ enum: ["en", "fr"], description: "Target language" })
  @IsIn(["en", "fr"])
  public language!: "en" | "fr";

  @ApiPropertyOptional({
    description: "Coach id (1–4). If omitted, defaults to motivateur.",
  })
  @IsOptional()
  @IsInt()
  @Min(COACH_ID_MIN)
  @Max(COACH_ID_MAX)
  public coachId?: number;

  @ApiProperty({ description: "Stub title passed to the LLM for reference" })
  @IsDefined()
  @IsString()
  public stubTitle!: string;

  @ApiProperty({ description: "Stub teaser passed to the LLM for reference" })
  @IsDefined()
  @IsString()
  public stubTeaser!: string;

  @ApiPropertyOptional({
    description: "Kind-specific structured context for the prompt",
  })
  @IsOptional()
  @IsObject()
  public kindSpecific?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Memory hooks for the prompt" })
  @IsOptional()
  @IsObject()
  public memoryHooks?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Suppress streak mentions" })
  @IsOptional()
  @IsBoolean()
  public suppressStreakCopy?: boolean;

  @ApiPropertyOptional({
    description:
      "If provided, backend fetches the user's profile/goal/milestones/streak and merges them into memoryHooks + kindSpecific so the LLM can personalize. Client-supplied fields take precedence.",
  })
  @IsOptional()
  @IsUUID("4")
  public userId?: string;
}
