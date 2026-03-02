import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VoiceController } from './voice.controller.js';
import { VoiceService } from './voice.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { TranscriptionResult, SynthesisResult } from './voice.types.js';

const MOCK_TRANSCRIPTION: TranscriptionResult = {
  text: 'Hello, how are you?',
  confidence: 0.98,
  duration_seconds: 3.5,
  language: 'en',
};

const MOCK_SYNTHESIS: SynthesisResult = {
  audio: Buffer.from('fake-audio'),
  content_type: 'audio/mpeg',
  duration_seconds: 2.1,
};

let controller: VoiceController;
let voiceService: {
  transcribe: jest.Mock;
  synthesize: jest.Mock;
};

beforeEach(async () => {
  voiceService = {
    transcribe: jest.fn(),
    synthesize: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [VoiceController],
    providers: [
      { provide: VoiceService, useValue: voiceService },
      { provide: SupabaseService, useValue: {} },
    ],
  }).compile();

  controller = module.get<VoiceController>(VoiceController);
});

describe('VoiceController', () => {
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('VoiceController.transcribe', () => {
  it('should return transcription result for valid audio', async () => {
    voiceService.transcribe.mockResolvedValue(MOCK_TRANSCRIPTION);

    const file = {
      buffer: Buffer.from('audio-data'),
      mimetype: 'audio/wav',
    } as Express.Multer.File;

    const result = await controller.transcribe(file);

    expect(result).toEqual(MOCK_TRANSCRIPTION);
    expect(voiceService.transcribe).toHaveBeenCalledWith(file.buffer, 'audio/wav');
  });

  it('should throw BadRequestException when no file is provided', async () => {
    await expect(controller.transcribe(undefined)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for unsupported format', async () => {
    const file = {
      buffer: Buffer.from('audio-data'),
      mimetype: 'audio/ogg',
    } as Express.Multer.File;

    await expect(controller.transcribe(file)).rejects.toThrow(BadRequestException);
  });
});

describe('VoiceController.synthesize', () => {
  it('should send audio binary response', async () => {
    voiceService.synthesize.mockResolvedValue(MOCK_SYNTHESIS);

    const mockRes = {
      set: jest.fn(),
      send: jest.fn(),
    } as unknown as import('express').Response;

    await controller.synthesize({ text: 'Hello', coach_id: 1 }, mockRes);

    expect(voiceService.synthesize).toHaveBeenCalledWith('Hello', 1);
    expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(mockRes.send).toHaveBeenCalledWith(MOCK_SYNTHESIS.audio);
  });

  it('should propagate NotFoundException for invalid coach', async () => {
    voiceService.synthesize.mockRejectedValue(
      new NotFoundException('Coach with id 999 not found'),
    );

    const mockRes = {
      set: jest.fn(),
      send: jest.fn(),
    } as unknown as import('express').Response;

    await expect(
      controller.synthesize({ text: 'Hello', coach_id: 999 }, mockRes),
    ).rejects.toThrow(NotFoundException);
  });
});
