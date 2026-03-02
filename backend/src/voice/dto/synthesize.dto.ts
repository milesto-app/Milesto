import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SynthesizeDto {
  @ApiProperty({ description: 'Text to synthesize into speech', example: 'Hello, how are you?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  public text!: string;

  @ApiProperty({ description: 'Coach ID to determine voice', example: 1 })
  @IsInt()
  @Min(1)
  @Max(100)
  public coach_id!: number;
}
