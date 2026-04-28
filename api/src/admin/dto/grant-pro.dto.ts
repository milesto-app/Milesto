import { ApiProperty } from "@nestjs/swagger";
import { IsISO8601 } from "class-validator";

export class GrantProDto {
  @ApiProperty({
    description: "ISO 8601 timestamp at which the manual pro override expires.",
  })
  @IsISO8601()
  public expiresAt!: string;
}
