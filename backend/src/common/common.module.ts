import { Global, Module } from '@nestjs/common';

import { UserLanguageService } from './user-language.service.js';

@Global()
@Module({
  providers: [UserLanguageService],
  exports: [UserLanguageService],
})
export class CommonModule {}
