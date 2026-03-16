import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: 'Goal ID for the voice session' })
  @IsUUID()
  public goalId!: string;

  @ApiPropertyOptional({ description: 'Existing conversation ID to continue' })
  @IsOptional()
  @IsUUID()
  public conversationId?: string;
}
