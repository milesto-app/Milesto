import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDefined,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateBy,
} from "class-validator";

const MAX_TITLE_LENGTH = 50;
const MAX_BODY_LENGTH = 150;
const MAX_DATA_KEYS = 20;
const MAX_DATA_KEY_LENGTH = 64;
const MAX_DATA_VALUE_LENGTH = 512;
const IS_APNS_DATA_PAYLOAD = "isApnsDataPayload";

function IsApnsDataPayload(): PropertyDecorator {
  return ValidateBy({
    name: IS_APNS_DATA_PAYLOAD,
    validator: {
      validate: (value: unknown): boolean =>
        SendNotificationDto.isValidDataPayload(value),
      defaultMessage: (): string =>
        "data must contain at most 20 string entries with keys <= 64 chars and values <= 512 chars",
    },
  });
}

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
  @MaxLength(MAX_TITLE_LENGTH)
  public title!: string;

  @ApiProperty({ description: "Notification body" })
  @IsDefined()
  @IsString()
  @MaxLength(MAX_BODY_LENGTH)
  public body!: string;

  @ApiPropertyOptional({
    description: "Additional data payload (string values only)",
  })
  @IsOptional()
  @IsObject()
  @IsApnsDataPayload()
  public data?: Record<string, string>;

  public static isValidDataPayload(
    value: unknown,
  ): value is Record<string, string> {
    if (value === undefined) {
      return true;
    }
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return false;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      entries.length <= MAX_DATA_KEYS &&
      entries.every(
        ([key, entryValue]) =>
          key.length <= MAX_DATA_KEY_LENGTH &&
          typeof entryValue === "string" &&
          entryValue.length <= MAX_DATA_VALUE_LENGTH,
      )
    );
  }
}
