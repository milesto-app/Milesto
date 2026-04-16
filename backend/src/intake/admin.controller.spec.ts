import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AuthGuard } from '../common/guards/auth.guard.js';
import { AdminGuard } from '../notifications/guards/admin.guard.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AdminController } from './admin.controller.js';
import { IntakeReembedService } from './intake-reembed.service.js';

describe('AdminController', () => {
  let controller: AdminController;
  let reembedService: { reembedMissing: jest.Mock };

  beforeEach(async () => {
    reembedService = {
      reembedMissing: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: IntakeReembedService, useValue: reembedService },
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  describe('POST reembed-missing', () => {
    it('should call reembedService.reembedMissing and return result', async () => {
      const expectedResult = { processed: 3, succeeded: 2, failed: 1 };
      reembedService.reembedMissing.mockResolvedValue(expectedResult);

      const result = await controller.reembedMissing();

      expect(reembedService.reembedMissing).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Guards', () => {
    it('should have AuthGuard and AdminGuard applied at the controller level', () => {
      const guards = Reflect.getMetadata('__guards__', AdminController);
      expect(guards).toBeDefined();

      expect(guards).toContain(AuthGuard);
      expect(guards).toContain(AdminGuard);
    });
  });
});
