import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, Length } from "class-validator";

const TOKEN_MIN_LENGTH = 64;
const TOKEN_MAX_LENGTH = 200;

export class DeliveryTelemetryDto {
  @ApiProperty({ description: "Outbox job id carried in the push payload" })
  @IsUUID()
  public jobId!: string;

  @ApiProperty({ description: "APNs device token that received the push" })
  @IsString()
  @Length(TOKEN_MIN_LENGTH, TOKEN_MAX_LENGTH)
  public deviceToken!: string;
}
