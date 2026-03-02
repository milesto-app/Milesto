import { Global, Module } from '@nestjs/common';

import { UserLanguageService } from './user-language.service.js';

@Global()
@Module({
  providers: [UserLanguageService],
  exports: [UserLanguageService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommonModule {}
