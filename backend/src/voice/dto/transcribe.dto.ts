import { ApiProperty } from '@nestjs/swagger';

export class TranscribeResponseDto {
  @ApiProperty({ description: 'Transcribed text', example: 'Hello, how are you?' })
  public text!: string;

  @ApiProperty({ description: 'Confidence score between 0 and 1', example: 0.98 })
  public confidence!: number;

  @ApiProperty({ description: 'Audio duration in seconds', example: 3.5 })
  public duration_seconds!: number;

  @ApiProperty({ description: 'Detected language code', example: 'en' })
  public language!: string;
}
