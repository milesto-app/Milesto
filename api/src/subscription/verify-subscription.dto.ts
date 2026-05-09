import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

const MAX_JWS_LENGTH = 1_048_576;

export class SyncSubscriptionDto {
  @ApiProperty({ description: "JWS transaction string from StoreKit" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_JWS_LENGTH)
  public transactionJws!: string;
}

export class VerifySubscriptionDto {
  @ApiProperty({
    description: "Deprecated alias for transactionJws during iOS migration",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_JWS_LENGTH)
  public jwsTransaction!: string;
}

export class AppleWebhookDto {
  @ApiProperty({
    description: "Signed payload from Apple Server Notifications V2",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_JWS_LENGTH)
  public signedPayload!: string;
}
