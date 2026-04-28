import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

const COACH_ID_MIN = 1;
const COACH_ID_MAX = 4;
const LANGUAGE_MIN_LENGTH = 2;
const LANGUAGE_MAX_LENGTH = 10;

export const ADMIN_USER_ROLES = ["user", "admin"] as const;
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

export class PatchUserDto {
  @ApiPropertyOptional({ enum: ADMIN_USER_ROLES })
  @IsOptional()
  @IsIn(ADMIN_USER_ROLES)
  public role?: AdminUserRole;

  @ApiPropertyOptional({ description: "BCP-47 language code (e.g. en, fr)" })
  @IsOptional()
  @IsString()
  @Length(LANGUAGE_MIN_LENGTH, LANGUAGE_MAX_LENGTH)
  public language?: string;

  @ApiPropertyOptional({ minimum: COACH_ID_MIN, maximum: COACH_ID_MAX })
  @IsOptional()
  @IsInt()
  @Min(COACH_ID_MIN)
  @Max(COACH_ID_MAX)
  public coachId?: number;
}
