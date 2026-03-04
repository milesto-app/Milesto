import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListGoalsQueryDto } from './list-goals-query.dto.js';

const DEFAULT_LIMIT = 20;
const CUSTOM_LIMIT = 10;
const CUSTOM_OFFSET = 5;
const OVER_MAX_LIMIT = 101;

function toDto(obj: Record<string, unknown>): ListGoalsQueryDto {
  return plainToInstance(ListGoalsQueryDto, obj);
}

describe('ListGoalsQueryDto - defaults and valid inputs', () => {
  it('should use defaults when no params provided', async () => {
    const dto = toDto({});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(DEFAULT_LIMIT);
    expect(dto.offset).toBe(0);
  });

  it('should accept valid limit and offset', async () => {
    const dto = toDto({ limit: CUSTOM_LIMIT, offset: CUSTOM_OFFSET });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(CUSTOM_LIMIT);
    expect(dto.offset).toBe(CUSTOM_OFFSET);
  });

  it('should transform string query params to numbers', async () => {
    const dto = toDto({ limit: '10', offset: '5' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(CUSTOM_LIMIT);
    expect(dto.offset).toBe(CUSTOM_OFFSET);
  });
});

describe('ListGoalsQueryDto - invalid inputs', () => {
  it('should reject limit less than 1', async () => {
    const dto = toDto({ limit: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject limit greater than 100', async () => {
    const dto = toDto({ limit: OVER_MAX_LIMIT });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject negative offset', async () => {
    const dto = toDto({ offset: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject non-integer limit', async () => {
    const dto = toDto({ limit: 10.5 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
