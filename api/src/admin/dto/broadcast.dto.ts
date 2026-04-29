import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import type { AdminBroadcastSegment } from "../notifications.types.js";

const MAX_TITLE_LENGTH = 50;
const MAX_BODY_LENGTH = 150;
const MAX_DATA_KEYS = 20;
const MAX_DATA_KEY_LENGTH = 64;
const MAX_DATA_VALUE_LENGTH = 512;

const SEGMENTS: AdminBroadcastSegment[] = ["all", "pro", "free"];

@ValidatorConstraint({ name: "isAdminBroadcastDataPayload", async: false })
class BroadcastDataPayloadConstraint implements ValidatorConstraintInterface {
  public validate(value: unknown): boolean {
    return BroadcastDto.isValidDataPayload(value);
  }

  public defaultMessage(): string {
    return `data must contain at most ${String(MAX_DATA_KEYS)} string entries with keys <= ${String(MAX_DATA_KEY_LENGTH)} chars and values <= ${String(MAX_DATA_VALUE_LENGTH)} chars`;
  }
}

export class BroadcastDto {
  @ApiProperty({
    description: "Notification title",
    maxLength: MAX_TITLE_LENGTH,
  })
  @IsDefined()
  @IsString()
  @MaxLength(MAX_TITLE_LENGTH)
  public title!: string;

  @ApiProperty({ description: "Notification body", maxLength: MAX_BODY_LENGTH })
  @IsDefined()
  @IsString()
  @MaxLength(MAX_BODY_LENGTH)
  public body!: string;

  @ApiPropertyOptional({
    description: "Additional data payload (string values only)",
  })
  @IsOptional()
  @IsObject()
  @Validate(BroadcastDataPayloadConstraint)
  public data?: Record<string, string>;

  @ApiPropertyOptional({
    enum: SEGMENTS,
    default: "all",
    description: "Recipient segment",
  })
  @IsOptional()
  @IsIn(SEGMENTS)
  public segment?: AdminBroadcastSegment;

  public static isValidDataPayload(
    value: unknown,
  ): value is Record<string, string> {
    if (value === undefined) {
      return true;
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
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
