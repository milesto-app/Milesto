import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service.js';

@Global()
@Module({
  providers: [AiService],
  exports: [AiService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AiModule {}
