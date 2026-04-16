import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

const TOKEN_MIN_LENGTH = 64;
const TOKEN_MAX_LENGTH = 200;

export class UnregisterTokenDto {
  @ApiProperty({ description: 'APNs device token to remove' })
  @IsString()
  @Length(TOKEN_MIN_LENGTH, TOKEN_MAX_LENGTH)
  public token!: string;
}
