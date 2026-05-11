import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { config } from "../../config/app.config.js";

const MAX_NAME_LENGTH = 200;
const MAX_LANGUAGE_LENGTH = 10;
const MAX_BIRTH_YEAR = new Date().getFullYear() - config.user.minAgeYears;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Gabriel" })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  public first_name?: string;

  @ApiPropertyOptional({ example: "Brument" })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  public last_name?: string;

  @ApiPropertyOptional({
    example: 1995,
    description: "Year of birth (1900..currentYear-13)",
  })
  @IsOptional()
  @IsInt()
  @Min(config.user.minBirthYear)
  @Max(MAX_BIRTH_YEAR)
  public birth_year?: number;

  @ApiPropertyOptional({ example: 1, description: "Coach id" })
  @IsOptional()
  @IsInt()
  public coach_id?: number;

  @ApiPropertyOptional({ example: "fr" })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LANGUAGE_LENGTH)
  public language?: string;
}
