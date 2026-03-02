import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerDto {
  @ApiProperty({
    description: 'UUID of the question being answered',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  public question_id!: string;

  @ApiPropertyOptional({
    description: 'Text answer (for text questions)',
    example: 'I want to improve my fitness',
  })
  @IsOptional()
  @IsString()
  public answer_text?: string;

  @ApiPropertyOptional({
    description: 'Numeric answer (for scale questions)',
    example: 7,
  })
  @IsOptional()
  @IsNumber()
  public answer_numeric?: number;

  @ApiPropertyOptional({
    description: 'Selected option(s) (for choice questions)',
    example: ['Option A'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public selected_options?: string[];
}

export class SubmitAnswersDto {
  @ApiProperty({
    description: 'Array of answers for the current batch',
    type: [AnswerDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  public answers!: AnswerDto[];
}
