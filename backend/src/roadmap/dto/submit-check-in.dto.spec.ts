import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SubmitCheckInDto } from './submit-check-in.dto.js';

describe('SubmitCheckInDto', () => {
  function toDto(obj: Record<string, unknown>): SubmitCheckInDto {
    return plainToInstance(SubmitCheckInDto, obj);
  }

  it('should pass validation with valid energy_level', async () => {
    const dto = toDto({ energy_level: 'good' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with energy_level and note', async () => {
    const dto = toDto({ energy_level: 'high', note: 'Feeling great' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it.each(['high', 'good', 'low', 'very_low'])(
    'should accept energy_level "%s"',
    async (level) => {
      const dto = toDto({ energy_level: level });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  it('should fail validation when energy_level is missing', async () => {
    const dto = toDto({});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const energyError = errors.find((e) => e.property === 'energy_level');
    expect(energyError).toBeDefined();
  });

  it('should fail validation when energy_level is empty string', async () => {
    const dto = toDto({ energy_level: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const energyError = errors.find((e) => e.property === 'energy_level');
    expect(energyError).toBeDefined();
  });

  it('should fail validation when energy_level is invalid', async () => {
    const dto = toDto({ energy_level: 'super_high' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const energyError = errors.find((e) => e.property === 'energy_level');
    expect(energyError).toBeDefined();
  });

  it('should fail validation when note exceeds 1000 characters', async () => {
    const dto = toDto({ energy_level: 'good', note: 'a'.repeat(1001) });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const noteError = errors.find((e) => e.property === 'note');
    expect(noteError).toBeDefined();
  });

  it('should pass validation when note is exactly 1000 characters', async () => {
    const dto = toDto({ energy_level: 'good', note: 'a'.repeat(1000) });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when note is omitted', async () => {
    const dto = toDto({ energy_level: 'low' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
