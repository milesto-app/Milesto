import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const MAX_TITLE_LENGTH = 200;

export class CreateGoalDto {
  @ApiProperty({
    example: 'Run a marathon',
    description: 'The goal title (max 200 chars)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TITLE_LENGTH)
  public title!: string;

  @ApiProperty({
    example: 'I want to complete my first marathon within 6 months',
    description: 'Detailed goal description',
  })
  @IsString()
  @IsNotEmpty()
  public description!: string;
}
