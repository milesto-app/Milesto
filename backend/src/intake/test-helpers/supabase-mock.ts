type Chain = Record<string, jest.Mock>;

export function mockQuestionsChain(
  data: unknown,
  error: unknown = null,
): Chain {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  };
}

export function mockGoalChain(data: unknown, error: unknown = null): Chain {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  };
}

export function mockPriorChain(data: unknown): Chain {
  const order = jest.fn().mockReturnThis();
  const chain: Chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order,
  };
  order.mockReturnValueOnce(chain).mockResolvedValueOnce({ data, error: null });
  return chain;
}

export function mockUpdateChain(error: unknown = null): Chain {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error }),
  };
}
