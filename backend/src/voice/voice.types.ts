export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration_seconds: number;
  language: string;
}

export interface SynthesisResult {
  audio: Buffer;
  content_type: string;
  duration_seconds: number;
}
