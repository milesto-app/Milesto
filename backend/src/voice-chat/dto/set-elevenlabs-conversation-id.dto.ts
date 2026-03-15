import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetElevenLabsConversationIdDto {
  @ApiProperty({ description: 'ElevenLabs conversation ID from the SDK' })
  @IsString()
  @IsNotEmpty()
  elevenLabsConversationId!: string;
}
