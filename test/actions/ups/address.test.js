/*
Copyright 2025 Adobe. All rights reserved.
Licensed under the Apache License, Version 2.0.
*/

const { main } = require('../../../actions/ups/address/index');
const { errorResponse } = require('../../../actions/utils');
const { getAccessToken, validateAddress } = require('../../../actions/ups/http/client');
const stateLib = require('@adobe/aio-lib-state');

jest.mock('@adobe/aio-lib-state');
jest.mock('../../../actions/utils');
jest.mock('../../../actions/ups/http/client');
jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn(() => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

describe('main function', () => {
  let params;
  let stateMock;

  beforeEach(() => {
    params = {
      CLIENT_ID: 'test-client-id',
      CLIENT_SECRET: 'test-client-secret',
      SERVICE_DOMAIN: 'https://api.ups.com/',
      address: {
        street_line: '123 Main St',
        city: 'New York',
        region_code: 'NY',
        postcode: '10001',
        country_code: 'US',
      },
      LOG_LEVEL: 'info',
    };
    stateMock = {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(true),
    };
    stateLib.init.mockResolvedValue(stateMock);
  });

  it('handles exceptions gracefully', async () => {
    // Ensure getAccessToken succeeds so validateAddress can throw an error
    getAccessToken.mockResolvedValue({ access_token: 'valid_token', expires_in: '3600' });

    // Ensure validateAddress throws an error
    validateAddress.mockRejectedValue(new Error('Validation API failed'));

    // Mock errorResponse return value
    errorResponse.mockReturnValue('Internal server error');

    const response = await main(params);

    expect(response).toBe('Internal server error');
    expect(errorResponse).toHaveBeenCalledWith(500, expect.stringContaining('There is a problem'), expect.any(Object));
  });

  it('uses cached UPS access token', async () => {
    stateMock.get.mockResolvedValue({ value: 'cached-token' });
    validateAddress.mockResolvedValue({ statusCode: 200, body: { candidates: [] } });

    const response = await main(params);
    expect(response).toEqual({ statusCode: 200, body: { candidates: [] } });
    expect(validateAddress).toHaveBeenCalledWith(params, 'cached-token');
  });

  it('fetches a new token if not cached', async () => {
    getAccessToken.mockResolvedValue({ access_token: 'new-token', expires_in: '3600' });
    validateAddress.mockResolvedValue({ statusCode: 200, body: { candidates: [] } });

    const response = await main(params);
    expect(response).toEqual({ statusCode: 200, body: { candidates: [] } });
    expect(getAccessToken).toHaveBeenCalledWith(params);
    expect(stateMock.put).toHaveBeenCalledWith('ups_token', 'new-token', { ttl: 3300 });
  });

  it('returns error if token fetch fails', async () => {
    getAccessToken.mockResolvedValue(null);
    errorResponse.mockReturnValue('Failed to get token error');

    const response = await main(params);
    expect(response).toBe('Failed to get token error');
    expect(errorResponse).toHaveBeenCalledWith(
      401,
      expect.stringContaining('Failed to get access token'),
      expect.any(Object)
    );
  });
});
