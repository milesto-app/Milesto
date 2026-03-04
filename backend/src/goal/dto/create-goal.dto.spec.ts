import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateGoalDto } from './create-goal.dto.js';

const EXCEEDS_MAX_LENGTH = 201;

function toDto(obj: Record<string, unknown>): CreateGoalDto {
  return plainToInstance(CreateGoalDto, obj);
}

describe('CreateGoalDto - valid inputs', () => {
  it('should pass validation with valid title and description', async () => {
    const dto = toDto({
      title: 'Run a marathon',
      description: 'Complete a full marathon',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with description only (title optional)', async () => {
    const dto = toDto({ description: 'Complete a full marathon' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CreateGoalDto - missing fields', () => {
  it('should fail when description is missing', async () => {
    const dto = toDto({ title: 'Run a marathon' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when description is empty string', async () => {
    const dto = toDto({ title: 'Run a marathon', description: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateGoalDto - length constraints', () => {
  it('should fail when title exceeds max length', async () => {
    const dto = toDto({
      title: 'a'.repeat(EXCEEDS_MAX_LENGTH),
      description: 'Some description',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
