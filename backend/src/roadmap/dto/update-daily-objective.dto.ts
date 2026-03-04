import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateDailyObjectiveDto {
  @ApiProperty({
    description: 'Whether the daily objective is completed',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  public is_completed!: boolean;
}
