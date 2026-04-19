import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

const MAX_MESSAGE_LENGTH = 2000;

export class SendMessageDto {
  @Transform(({ value }): string | undefined =>
    typeof value === "string" ? value : undefined,
  )
  @IsUUID()
  @IsOptional()
  public conversationId?: string;

  @IsUUID()
  @IsNotEmpty()
  public goalId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  public content!: string;
}
