import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service.js';

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SupabaseModule {}
