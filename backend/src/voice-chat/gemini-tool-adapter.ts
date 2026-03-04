import type { FunctionDeclaration, Schema } from '@google/genai';
import { Type } from '@google/genai';

import type { ChatToolEntry } from '../chat/types/chat.types.js';

interface OpenAiParameters {
  readonly type: string;
  readonly properties: Record<string, unknown>;
  readonly required: string[];
}

const TYPE_MAP: Record<string, Type> = {
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
  array: Type.ARRAY,
  object: Type.OBJECT,
};

export function adaptToolsToGemini(
  registry: Map<string, ChatToolEntry>,
): FunctionDeclaration[] {
  const declarations: FunctionDeclaration[] = [];

  for (const [, entry] of registry) {
    const declaration = convertToolEntry(entry);
    if (declaration !== null) {
      declarations.push(declaration);
    }
  }

  return declarations;
}

function convertToolEntry(entry: ChatToolEntry): FunctionDeclaration | null {
  const def = entry.definition;
  if (def.type !== 'function') {
    return null;
  }

  const fn = def.function;
  const params = hasParameters(fn.parameters) ? fn.parameters : undefined;

  if (params === undefined || Object.keys(params.properties).length === 0) {
    return { name: fn.name, description: fn.description ?? '' };
  }

  return {
    name: fn.name,
    description: fn.description ?? '',
    parameters: {
      type: Type.OBJECT,
      properties: convertPropertyTypes(params.properties),
      required: params.required,
    },
  };
}

function hasParameters(value: unknown): value is OpenAiParameters {
  return (
    typeof value === 'object' &&
    value !== null &&
    'properties' in value &&
    'required' in value
  );
}

function convertPropertyTypes(
  properties: Record<string, unknown>,
): Record<string, Schema> {
  const result: Record<string, Schema> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== 'object' || value === null) {
      continue;
    }

    const prop = value as Record<string, unknown>;
    const schema: Schema = {};

    if (typeof prop.type === 'string') {
      schema.type = TYPE_MAP[prop.type] ?? Type.STRING;
    }
    if (typeof prop.description === 'string') {
      schema.description = prop.description;
    }

    result[key] = schema;
  }

  return result;
}
