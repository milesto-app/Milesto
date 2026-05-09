import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

const MAX_NAME_LENGTH = 200;
const MAX_LANGUAGE_LENGTH = 10;

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
    example: "1995-04-12",
    description: "ISO date YYYY-MM-DD",
  })
  @IsOptional()
  @IsISO8601()
  public date_of_birth?: string;

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
