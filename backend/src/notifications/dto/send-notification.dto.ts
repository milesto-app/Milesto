import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDefined,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class SendNotificationDto {
  @ApiPropertyOptional({
    type: [String],
    description: "Target user IDs. If omitted, broadcasts to all users.",
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  public userIds?: string[];

  @ApiProperty({ description: "Notification title" })
  @IsDefined()
  @IsString()
  public title!: string;

  @ApiProperty({ description: "Notification body" })
  @IsDefined()
  @IsString()
  public body!: string;

  @ApiPropertyOptional({
    description: "Additional data payload (string values only)",
  })
  @IsOptional()
  @IsObject()
  public data?: Record<string, string>;
}
