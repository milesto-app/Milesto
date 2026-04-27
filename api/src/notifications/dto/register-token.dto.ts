import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, Length } from "class-validator";

const TOKEN_MIN_LENGTH = 64;
const TOKEN_MAX_LENGTH = 200;

export class RegisterTokenDto {
  @ApiProperty({ description: "APNs device token (hex string)" })
  @IsString()
  @Length(TOKEN_MIN_LENGTH, TOKEN_MAX_LENGTH)
  public token!: string;

  @ApiProperty({
    enum: ["sandbox", "production"],
    description: "APNs environment",
  })
  @IsIn(["sandbox", "production"])
  public environment!: string;
}
