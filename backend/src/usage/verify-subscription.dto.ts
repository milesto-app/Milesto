import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifySubscriptionDto {
  @ApiProperty({ description: 'JWS transaction string from StoreKit' })
  @IsString()
  @IsNotEmpty()
  public jwsTransaction!: string;
}
