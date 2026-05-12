import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";

const DEBRIEF_NOTE_MAX_LENGTH = 5000;

export class SubmitDebriefDto {
  @ApiProperty({
    description: "Milestone ID for this debrief",
    example: "uuid-here",
  })
  @IsUUID()
  public milestone_id!: string;

  @ApiProperty({
    description: "Free-text reflection on the week",
    example:
      "This week was productive. The writing tasks took longer than expected.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEBRIEF_NOTE_MAX_LENGTH)
  public note!: string;
}
