import { adaptToolsToGemini } from './gemini-tool-adapter.js';
import type { ChatToolEntry } from '../chat/types/chat.types.js';

const EXPECTED_TOOL_COUNT = 2;

function createEntry(
  name: string,
  description: string,
  parameters?: { properties: Record<string, unknown>; required: string[] },
): ChatToolEntry {
  return {
    definition: {
      type: 'function',
      function: {
        name,
        description,
        parameters: {
          type: 'object',
          properties: parameters?.properties ?? {},
          required: parameters?.required ?? [],
        },
      },
    },
    executor: jest.fn(),
  };
}

function buildRegistry(
  ...entries: [string, ChatToolEntry][]
): Map<string, ChatToolEntry> {
  return new Map(entries);
}

describe('adaptToolsToGemini', () => {
  it('should convert a tool with parameters to Gemini format', () => {
    const registry = buildRegistry([
      'toggle',
      createEntry('toggle', 'Toggle a task', {
        properties: {
          objectiveId: { type: 'string', description: 'The ID' },
          isCompleted: { type: 'boolean', description: 'Status' },
        },
        required: ['objectiveId', 'isCompleted'],
      }),
    ]);

    const result = adaptToolsToGemini(registry);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('toggle');
    expect(result[0].description).toBe('Toggle a task');
    expect(result[0].parameters?.properties).toBeDefined();
  });

  it('should convert a tool without parameters', () => {
    const registry = buildRegistry([
      'getDailyObjectives',
      createEntry('getDailyObjectives', 'Fetch objectives'),
    ]);

    const result = adaptToolsToGemini(registry);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('getDailyObjectives');
    expect(result[0].parameters).toBeUndefined();
  });

  it('should convert multiple tools', () => {
    const registry = buildRegistry(
      ['tool1', createEntry('tool1', 'First tool')],
      ['tool2', createEntry('tool2', 'Second tool')],
    );

    const result = adaptToolsToGemini(registry);
    expect(result).toHaveLength(EXPECTED_TOOL_COUNT);
  });

  it('should return empty array for empty registry', () => {
    const result = adaptToolsToGemini(new Map());
    expect(result).toHaveLength(0);
  });
});
