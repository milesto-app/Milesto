import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_TEXT_LENGTH = 5000;
const MAX_COACH_ID = 100;
const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;

export type SynthesizeLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export class SynthesizeDto {
  @ApiProperty({
    description: 'Text to synthesize into speech',
    example: 'Hello, how are you?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TEXT_LENGTH)
  public text!: string;

  @ApiProperty({ description: 'Coach ID to determine voice', example: 1 })
  @IsInt()
  @Min(1)
  @Max(MAX_COACH_ID)
  public coach_id!: number;

  @ApiPropertyOptional({
    description:
      'Override voice language. When omitted, the user profile language is used.',
    enum: SUPPORTED_LANGUAGES,
  })
  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGES)
  public language?: SynthesizeLanguage;
}
