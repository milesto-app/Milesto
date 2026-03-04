import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { UserId } from '../common/decorators/user.decorator.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { config } from '../config/app.config.js';
import { SynthesizeDto } from './dto/synthesize.dto.js';
import { VoiceService } from './voice.service.js';
import type { TranscriptionResult } from './voice.types.js';

const AI_LIMIT = config.throttle.aiEndpointLimit;
const AI_TTL = config.throttle.aiEndpointTtlMs;

@ApiTags('voice')
@ApiBearerAuth()
@Controller('voice')
@UseGuards(AuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  @ApiOperation({ summary: 'Transcribe an audio file to text' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Transcription result' })
  @ApiResponse({ status: 400, description: 'Invalid audio file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Throttle({ default: { limit: AI_LIMIT, ttl: AI_TTL } })
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: config.voice.maxAudioSizeBytes },
    }),
  )
  public async transcribe(
    @UploadedFile() file: Express.Multer.File | undefined,
    @UserId() userId: string,
  ): Promise<TranscriptionResult> {
    if (file === undefined) {
      throw new BadRequestException('Audio file is required');
    }

    if (!config.voice.supportedInputFormats.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported audio format: ${file.mimetype}. Supported: ${config.voice.supportedInputFormats.join(', ')}`,
      );
    }

    return this.voiceService.transcribe(file.buffer, file.mimetype, userId);
  }

  @Post('synthesize')
  @ApiOperation({ summary: 'Synthesize text to speech audio' })
  @ApiResponse({ status: 200, description: 'Audio binary response' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Coach not found' })
  @Throttle({ default: { limit: AI_LIMIT, ttl: AI_TTL } })
  public async synthesize(
    @Body() dto: SynthesizeDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.voiceService.synthesize(dto.text, dto.coach_id);

    res.set('Content-Type', result.content_type);
    res.set('Content-Length', String(result.audio.length));
    res.set('X-Audio-Duration', String(result.duration_seconds));
    res.send(result.audio);
  }
}
