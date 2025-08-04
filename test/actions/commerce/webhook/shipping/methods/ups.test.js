const { getUpsShippingMethod } = require('../../../../../../actions/commerce/webhook/shipping/methods/ups');
const stateLib = require('@adobe/aio-lib-state');
const got = require('got');
const { getAccessToken } = require('../../../../../../actions/ups/http/client');
const { createShippingOperation } = require('../../../../../../lib/adobe-commerce');
const { getStateCode } = require('../../../../../../actions/commerce/aio-state');
const { checkMissingRequestInputs } = require('../../../../../../actions/utils');

jest.mock('@adobe/aio-lib-state');
jest.mock('got');
jest.mock('../../../../../../actions/ups/http/client');
jest.mock('../../../../../../lib/adobe-commerce');
jest.mock('../../../../../../actions/commerce/aio-state');
jest.mock('../../../../../../actions/utils');

describe('getUpsShippingMethod', () => {
  let params;
  let logger;

  beforeEach(() => {
    params = {
      rateRequest: {
        dest_country_id: 'US',
        dest_postcode: '90210',
        dest_region_id: 'CA',
        package_weight: 10,
      },
      UPS_RATE_ENDPOINT: 'https://api.ups.com/rate',
      UPS_CARRIER_CODE: 'ups',
      UPS_DOMESTIC_PAY_PERCENTAGE: 1.1,
      UPS_INTERNATIONAL_PAY_PERCENTAGE: 1.2,
      UPS_STATE_CODE: 'CA',
      UPS_POSTAL_CODE: '90210',
      UPS_COUNTRY_CODE: 'US',
      UPS_DIMENSIONS_UNIT_OF_MEASUREMENT_CODE: 'IN',
      UPS_DIMENSIONS_UNIT_OF_MEASUREMENT_DESCRIPTION: 'Inches',
      UPS_PACKAGE_UNIT_OF_MEASUREMENT: 'LBS',
      COMMERCE_WEBACTION_GRAPH_QL_URL: 'https://api.commerce.com/graphql',
    };
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
  });

  it('should return cached shipping methods if available', async () => {
    const state = {
      get: jest.fn().mockResolvedValue({ value: JSON.stringify([{ method: 'UPS Ground' }]) }),
    };
    stateLib.init.mockResolvedValue(state);
    checkMissingRequestInputs.mockReturnValue(null);

    const result = await getUpsShippingMethod(params, logger);
    expect(state.get).toHaveBeenCalled();
    expect(result).toEqual([{ method: 'UPS Ground' }]);
    expect(logger.info).toHaveBeenCalledWith('ups rates found from cache');
  });

  it('should fetch shipping methods from UPS API and cache the result', async () => {
    const state = {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(null),
    };
    stateLib.init.mockResolvedValue(state);
    checkMissingRequestInputs.mockReturnValue(null);

    const upsClient = { access_token: 'token' };
    getAccessToken.mockResolvedValue(upsClient);

    const stateResponse = { body: { regionCode: 'CA' } };
    getStateCode.mockResolvedValue(stateResponse);

    const response = {
      body: {
        RateResponse: {
          Response: { ResponseStatus: { Code: '1' } },
          RatedShipment: [
            {
              Service: { Code: '03' },
              TotalCharges: { MonetaryValue: '10.00' },
            },
          ],
        },
      },
    };
    got.post.mockResolvedValue(response);
    createShippingOperation.mockReturnValue({
      carrier_code: 'ups',
      method: 'ups_ground',
      method_title: 'UPS Ground',
      price: 11.0,
      cost: 11.0,
      additional_data: [],
    });

    const result = await getUpsShippingMethod(params, logger);
    expect(result).toEqual([
      {
        carrier_code: 'ups',
        method: 'ups_ground',
        method_title: 'UPS Ground',
        price: 11.0,
        cost: 11.0,
        additional_data: [],
      },
    ]);
    expect(state.put).toHaveBeenCalledWith(expect.any(String), JSON.stringify(result), { ttl: 300 });
  });

  it('should return an empty array if UPS API response is invalid', async () => {
    const state = {
      get: jest.fn().mockResolvedValue(null),
    };
    stateLib.init.mockResolvedValue(state);
    checkMissingRequestInputs.mockReturnValue(null);

    const upsClient = { access_token: 'token' };
    getAccessToken.mockResolvedValue(upsClient);

    const response = {
      body: {
        RateResponse: {
          Response: { ResponseStatus: { Code: '0' } },
        },
      },
    };
    got.post.mockResolvedValue(response);

    const result = await getUpsShippingMethod(params, logger);
    expect(result).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    const state = {
      get: jest.fn().mockResolvedValue(null),
    };
    stateLib.init.mockResolvedValue(state);
    checkMissingRequestInputs.mockReturnValue(null);

    got.post.mockRejectedValue(new Error('API error'));

    const result = await getUpsShippingMethod(params, logger);
    expect(logger.error).toHaveBeenCalledWith('Error fetching UPS rates dd:', expect.any(String));
    expect(result).toEqual([]);
  });

  it('should handle missing cache initialization gracefully', async () => {
    stateLib.init.mockRejectedValue(new Error('Cache initialization error'));
    checkMissingRequestInputs.mockReturnValue(null);

    const result = await getUpsShippingMethod(params, logger);
    expect(logger.error).toHaveBeenCalledWith('Error fetching UPS rates dd:', expect.any(String));
    expect(result).toEqual([]);
  });

  it('should handle missing region code gracefully', async () => {
    const state = {
      get: jest.fn().mockResolvedValue(null),
    };
    stateLib.init.mockResolvedValue(state);
    checkMissingRequestInputs.mockReturnValue(null);

    getStateCode.mockResolvedValue({ body: { regionCode: null } });

    const result = await getUpsShippingMethod(params, logger);
    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith('Error fetching UPS rates dd:', expect.any(String));
  });
});
