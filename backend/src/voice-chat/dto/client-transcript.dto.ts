import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ClientTranscriptTurnDto {
  @ApiProperty({ enum: ['user', 'agent'] })
  @IsIn(['user', 'agent'])
  public role!: 'user' | 'agent';

  @ApiProperty({ description: 'Transcript text for this turn' })
  @IsString()
  public content!: string;

  @ApiProperty({ description: 'ISO 8601 timestamp of when the turn occurred' })
  @IsDateString()
  public timestamp!: string;

  @ApiProperty({ description: 'Zero-based turn index within the session' })
  @IsInt()
  @Min(0)
  public turnIndex!: number;
}

export class ClientTranscriptDto {
  @ApiProperty({ type: [ClientTranscriptTurnDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ClientTranscriptTurnDto)
  public turns!: ClientTranscriptTurnDto[];
}
