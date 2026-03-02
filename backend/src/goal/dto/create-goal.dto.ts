import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MAX_TITLE_LENGTH = 200;

export class CreateGoalDto {
  @ApiPropertyOptional({
    example: 'Run a marathon',
    description: 'The goal title (max 200 chars). Auto-generated from description if omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TITLE_LENGTH)
  public title?: string;

  @ApiProperty({
    example: 'I want to complete my first marathon within 6 months',
    description: 'Detailed goal description',
  })
  @IsString()
  @IsNotEmpty()
  public description!: string;
}
