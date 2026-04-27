/// <reference types="multer" />

import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { config } from "../config/app.config.js";
import { TranscriptionService } from "./transcription.service.js";
import type { TranscriptionResult } from "./transcription.types.js";

const AI_LIMIT = config.throttle.aiEndpointLimit;
const AI_TTL = config.throttle.aiEndpointTtlMs;

@ApiTags("transcription")
@ApiBearerAuth()
@Controller("transcription")
@UseGuards(AuthGuard)
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post()
  @ApiOperation({ summary: "Transcribe an audio file to text" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 200, description: "Transcription result" })
  @ApiResponse({ status: 400, description: "Invalid audio file" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Throttle({ default: { limit: AI_LIMIT, ttl: AI_TTL } })
  @UseInterceptors(
    FileInterceptor("audio", {
      limits: { fileSize: config.transcription.maxAudioSizeBytes },
    }),
  )
  public async transcribe(
    @UploadedFile() file: Express.Multer.File | undefined,
    @UserId() userId: string,
  ): Promise<TranscriptionResult> {
    if (file === undefined) {
      throw new BadRequestException("Audio file is required");
    }

    if (!config.transcription.supportedInputFormats.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported audio format: ${file.mimetype}. Supported: ${config.transcription.supportedInputFormats.join(", ")}`,
      );
    }

    return this.transcriptionService.transcribe(
      file.buffer,
      file.mimetype,
      userId,
    );
  }
}
