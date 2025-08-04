/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const { Core } = require('@adobe/aio-sdk');
const got = require('got');

jest.mock('@adobe/aio-sdk');
jest.mock('got');
jest.mock('../../../../../actions/utils');
jest.mock('../../../../../actions/commerce/webhook/tax/vertex/http/client/soap');
jest.mock('../../../../../lib/adobe-commerce');
jest.mock('../../../../../actions/commerce/webhook/tax/zonos/index');

const { stringParameters } = require('../../../../../actions/utils');
const {
  webhookSuccessResponse,
  webhookErrorResponseWithException,
  webhookVerify,
} = require('../../../../../lib/adobe-commerce');
const {
  generateVertexSoapRequest,
  parseVertexResponse,
} = require('../../../../../actions/commerce/webhook/tax/vertex/http/client/soap');
const { getZonosResponse } = require('../../../../../actions/commerce/webhook/tax/zonos/index');
const { main } = require('../../../../../actions/commerce/webhook/tax/calculate');

const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Sample oopQuote data
const sampleQuote = {
  ship_to_address: {
    country: 'US',
    street: '123 Main St',
    city: 'CityName',
    region_code: 'CA',
    region: 'California',
    postcode: '12345',
  },
  items: [
    {
      code: 'item1',
      quantity: 2,
      unit_price: 50,
      sku: 'AB309',
      tax_class: 'TPP/Goods',
      type: 'simple',
    },
  ],
  shipping: {
    shipping_method: 'flatrate_flatrate',
  },
};

const encodedBody = Buffer.from(JSON.stringify({ oopQuote: sampleQuote })).toString('base64');

beforeEach(() => {
  jest.clearAllMocks();

  Core.Logger.mockReturnValue(mockLogger);
  stringParameters.mockImplementation((params) => JSON.stringify(params));

  webhookErrorResponseWithException.mockImplementation((message) => ({
    statusCode: 200,
    body: {
      op: 'exception',
      type: '\\Magento\\Framework\\GraphQl\\Exception\\GraphQlInputException',
      message,
    },
  }));

  webhookSuccessResponse.mockReturnValue({
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  });

  webhookVerify.mockReturnValue({ success: true });
  generateVertexSoapRequest.mockReturnValue('<SOAP Request>');
  parseVertexResponse.mockReturnValue([{ op: 'replace', path: 'result/tax_amount', value: 5 }]);
  getZonosResponse.mockResolvedValue([{ op: 'replace', path: 'result/tax_amount', value: 10 }]);

  global.atob = jest.fn().mockImplementation((str) => Buffer.from(str, 'base64').toString());
});

afterEach(() => {
  jest.clearAllMocks();
  delete global.atob;
});

describe('Tax Calculation Action', () => {
  const defaultParams = {
    VERTEX_SERVICE_URL: 'http://vertex.api.url',
    COMMERCE_WEBACTION_GRAPH_QL_URL: '/graphql',
    LOG_LEVEL: 'info',
    VERTEX_TRUST_ID: 'trustId',
    SELLER_COMPANY: 'SellerCompany',
    SELLER_STREET: 'SellerStreet',
    SELLER_CITY: 'SellerCity',
    SELLER_DIVISION: 'SellerDivision',
    SELLER_POSTAL_CODE: 'SellerPostal',
    SELLER_COUNTRY: 'US',
    __ow_body: encodedBody,
  };

  describe('Webhook Verification', () => {
    test('should return error when webhook verification fails', async () => {
      webhookVerify.mockReturnValue({ success: false, error: 'Invalid signature' });

      const response = await main(defaultParams);
      expect(response.statusCode).toBe(200);
      expect(webhookVerify).toHaveBeenCalledWith(defaultParams);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to verify the webhook signature: Invalid signature');
      expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      );
    });

    test('should proceed with tax calculation when webhook verification succeeds', async () => {
      webhookVerify.mockReturnValue({ success: true });
      got.post.mockResolvedValue({
        body: '<SOAP Response>',
      });

      const response = await main(defaultParams);

      expect(webhookVerify).toHaveBeenCalledWith(defaultParams);
      expect(response).toEqual({
        statusCode: 200,
        body: JSON.stringify([{ op: 'replace', path: 'result/tax_amount', value: 5 }]),
      });
    });
  });

  describe('US Country-specific Tax Calculation', () => {
    test('should use Vertex for US addresses', async () => {
      got.post.mockResolvedValue({
        body: '<SOAP Response>',
      });

      const response = await main(defaultParams);

      expect(response.statusCode).toBe(200);
      expect(got.post).toHaveBeenCalledWith('http://vertex.api.url', {
        body: '<SOAP Request>',
        headers: {
          'Content-Type': 'text/xml',
          SOAPAction: 'CalculateTax90',
        },
        responseType: 'text',
      });
      expect(parseVertexResponse).toHaveBeenCalledWith('<SOAP Response>');
      expect(JSON.parse(response.body)).toEqual([{ op: 'replace', path: 'result/tax_amount', value: 5 }]);
    });

    test('should return error response when Vertex returns empty operations', async () => {
      got.post.mockResolvedValue({
        body: '<SOAP Response>',
      });
      parseVertexResponse.mockReturnValue([]);

      const response = await main(defaultParams);
      expect(response.statusCode).toBe(200);
      expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
        'Something went wrong with tax calculation. Please retry or contact customer support.'
      );
    });
  });

  describe('International Tax Calculation', () => {
    test('should use Zonos for non-US addresses', async () => {
      const internationalParams = {
        ...defaultParams,
        __ow_body: Buffer.from(
          JSON.stringify({
            oopQuote: {
              ...sampleQuote,
              ship_to_address: {
                ...sampleQuote.ship_to_address,
                country: 'CA', // Canada
              },
            },
          })
        ).toString('base64'),
      };

      const response = await main(internationalParams);

      expect(getZonosResponse).toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([{ op: 'replace', path: 'result/tax_amount', value: 10 }]);
    });

    test('should return error response when Zonos returns empty operations', async () => {
      const internationalParams = {
        ...defaultParams,
        __ow_body: Buffer.from(
          JSON.stringify({
            oopQuote: {
              ...sampleQuote,
              ship_to_address: {
                ...sampleQuote.ship_to_address,
                country: 'CA',
              },
            },
          })
        ).toString('base64'),
      };

      getZonosResponse.mockResolvedValue([]);

      const response = await main(internationalParams);
      expect(response.statusCode).toBe(200);
      expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
        'Something went wrong with tax calculation. Please retry or contact customer support.'
      );
    });
  });

  describe('Edge Cases', () => {
    test('should return success when country code is missing', async () => {
      const noCountryParams = {
        ...defaultParams,
        __ow_body: Buffer.from(
          JSON.stringify({
            oopQuote: {
              ...sampleQuote,
              ship_to_address: {
                ...sampleQuote.ship_to_address,
                country: null,
              },
            },
          })
        ).toString('base64'),
      };

      const response = await main(noCountryParams);
      expect(response.statusCode).toBe(200);
      expect(webhookSuccessResponse).toHaveBeenCalled();
      expect(got.post).not.toHaveBeenCalled();
      expect(getZonosResponse).not.toHaveBeenCalled();
    });

    test('should return success when subtotal is zero', async () => {
      const zeroSubtotalParams = {
        ...defaultParams,
        __ow_body: Buffer.from(
          JSON.stringify({
            oopQuote: {
              ...sampleQuote,
              items: [
                {
                  ...sampleQuote.items[0],
                  unit_price: 0,
                },
              ],
            },
          })
        ).toString('base64'),
      };

      const response = await main(zeroSubtotalParams);
      expect(response.statusCode).toBe(200);
      expect(webhookSuccessResponse).toHaveBeenCalled();
      expect(got.post).not.toHaveBeenCalled();
      expect(getZonosResponse).not.toHaveBeenCalled();
    });

    test('should handle malformed request body', async () => {
      global.atob.mockImplementation(() => {
        throw new Error('Invalid base64 string');
      });

      const response = await main(defaultParams);
      expect(response.statusCode).toBe(200);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(webhookErrorResponseWithException).toHaveBeenCalledWith('Tax Error: Invalid base64 string');
    });
  });

  describe('Error Handling', () => {
    test('should handle Vertex API errors gracefully', async () => {
      got.post.mockRejectedValue(new Error('Vertex API Error'));

      const response = await main(defaultParams);
      expect(response.statusCode).toBe(200);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(webhookErrorResponseWithException).toHaveBeenCalledWith('Tax Error: Vertex API Error');
    });

    test('should handle Zonos API errors gracefully', async () => {
      const internationalParams = {
        ...defaultParams,
        __ow_body: Buffer.from(
          JSON.stringify({
            oopQuote: {
              ...sampleQuote,
              ship_to_address: {
                ...sampleQuote.ship_to_address,
                country: 'CA',
              },
            },
          })
        ).toString('base64'),
      };

      getZonosResponse.mockRejectedValue(new Error('Zonos API Error'));
      const response = await main(internationalParams);
      expect(response.statusCode).toBe(200);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(webhookErrorResponseWithException).toHaveBeenCalledWith('Tax Error: Zonos API Error');
    });
  });
});
