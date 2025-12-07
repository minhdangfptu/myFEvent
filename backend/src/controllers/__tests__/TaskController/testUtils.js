// tests/TaskController/testUtils.js
import { vi } from 'vitest';

export const createMockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

export const createMockReq = ({
  params = {},
  query = {},
  body = {},
  user = { id: 'user-id-1' },
} = {}) => ({
  params,
  query,
  body,
  user,
});

export const createMockReqRes = ({
  params = {},
  query = {},
  body = {},
  user = { id: 'user1' },
} = {}) => {
  const req = { params, query, body, user };
  const res = createMockRes();
  return { req, res };
};

export const resetAllMocks = () => {
  vi.clearAllMocks();
};
