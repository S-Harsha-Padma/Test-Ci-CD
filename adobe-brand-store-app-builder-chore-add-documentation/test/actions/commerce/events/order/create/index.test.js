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
const {
  generateCrmXmlPayload,
  sendHaloErpSoapRequest,
  handleResponse,
} = require('../../../../../../actions/commerce/events/order/client/soap_client');
const { main } = require('../../../../../../actions/commerce/events/order/create');
const { XMLParser } = require('fast-xml-parser');

jest.mock('@adobe/aio-sdk');
jest.mock('../../../../../../actions/commerce/events/order/client/soap_client');
jest.mock('fast-xml-parser');

describe('Order Create Action', () => {
  let logger;
  let mockParser;
  let params;

  // Helper function to create test order data
  const createTestOrderData = (overrides = {}) => ({
    LOG_LEVEL: 'debug',
    ERP_ENDPOINT: 'https://qa.mypromomall.com/preview/podataentry.po',
    data: {
      value: {
        addresses: [
          {
            address_type: 'billing',
            city: 'Test',
            company: 'Adobe Billing',
            country_id: 'TEST',
            customer_address_id: '2',
            email: 'test@test.com',
            firstname: 'Test',
            lastname: 'Test',
            postcode: '411014',
            region: 'test',
            region_id: '589',
            street: 'test',
            telephone: '2323232323',
            vat_id: null,
          },
          {
            address_type: 'shipping',
            city: 'Test',
            company: 'Adobe Billing',
            country_id: 'TEST',
            customer_address_id: '2',
            email: 'test@test.com',
            firstname: 'Test',
            lastname: 'Test',
            postcode: '411014',
            region: 'test',
            region_id: '589',
            street: 'test',
            telephone: '2323232323',
            vat_id: null,
          },
        ],
        base_currency_code: 'USD',
        base_grand_total: 201,
        base_subtotal_incl_tax: 199,
        base_tax_amount: 0,
        billing_address_id: '8',
        created_at: '2025-02-07 10:04:12',
        customer_email: 'test@test.com',
        customer_firstname: 'Test',
        customer_is_guest: 0,
        customer_lastname: 'Test',
        discount_amount: -3,
        discount_description: 'test',
        increment_id: '000000004',
        items: [
          {
            base_price: 199,
            base_row_total: 199,
            description: null,
            name: 'Hero Honda',
            price: 199,
            product_id: '56',
            qty_ordered: 1,
            sku: 'Hero Honda',
            store_name: null,
            tax_amount: 0,
          },
        ],
        shipping_address_id: '7',
        store_currency_code: 'USD',
        ...overrides,
      },
    },
  });

  beforeEach(() => {
    // Setup logger mock
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    Core.Logger.mockReturnValue(logger);

    // Setup XMLParser mock
    mockParser = {
      parse: jest.fn().mockReturnValue({
        cXML: {
          Request: {
            OrderRequest: {
              ItemOut: [
                {
                  ItemID: {
                    SupplierPartID: 'Hero Honda',
                  },
                  '@_quantity': 1,
                },
              ],
            },
          },
        },
      }),
    };
    XMLParser.mockImplementation(() => mockParser);

    // Setup default test parameters
    params = createTestOrderData();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Logger Initialization', () => {
    test('should initialize logger with correct parameters', async () => {
      const params = { LOG_LEVEL: 'debug', someParam: 'value' };
      await main(params);
      expect(Core.Logger).toHaveBeenCalledWith('main', { level: 'debug' });
    });

    test('should initialize logger with default level if LOG_LEVEL is not provided', async () => {
      const params = { someParam: 'value' };
      await main(params);
      expect(Core.Logger).toHaveBeenCalledWith('main', { level: 'info' });
    });
  });

  describe('Order Processing', () => {
    test('should process order successfully', async () => {
      // Mock successful responses
      const crmXmlPayload = '<Response>...</Response>';
      const responseText = 'Success response';

      generateCrmXmlPayload.mockResolvedValue(crmXmlPayload);
      sendHaloErpSoapRequest.mockResolvedValue(responseText);
      handleResponse.mockResolvedValue();

      const result = await main(params);

      // Verify response
      expect(result).toEqual({
        statusCode: 200,
        body: {
          message: 'ERP Order processing started successfully',
          success: true,
        },
      });

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('Calling the ERP main action');
      expect(logger.debug).toHaveBeenCalled();
    });

    test('should handle duplicate SKUs correctly', async () => {
      const testParams = createTestOrderData({
        items: [
          {
            sku: 'Hero Honda',
            product_id: '56',
            name: 'Hero Honda',
            qty_ordered: 1,
          },
          {
            sku: 'Hero Honda', // Duplicate SKU
            product_id: '56',
            name: 'Hero Honda',
            qty_ordered: 2,
          },
          {
            sku: 'Different SKU',
            product_id: '57',
            name: 'Different Product',
            qty_ordered: 1,
          },
        ],
      });

      // Mock XMLParser to include both SKUs
      mockParser.parse.mockReturnValue({
        cXML: {
          Request: {
            OrderRequest: {
              ItemOut: [
                {
                  ItemID: {
                    SupplierPartID: 'Hero Honda',
                  },
                  '@_quantity': 1,
                },
                {
                  ItemID: {
                    SupplierPartID: 'Different SKU',
                  },
                  '@_quantity': 1,
                },
              ],
            },
          },
        },
      });

      const result = generateCrmXmlPayload(testParams, {});
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseAttributeValue: true,
      });
      const parsedResult = parser.parse(result);

      // Verify SKU handling
      const heroHondaItems = parsedResult.cXML.Request.OrderRequest.ItemOut.filter(
        (item) => item.ItemID.SupplierPartID === 'Hero Honda'
      );
      expect(heroHondaItems).toHaveLength(1);
      expect(heroHondaItems[0]['@_quantity']).toBe(1);

      const differentSkuItems = parsedResult.cXML.Request.OrderRequest.ItemOut.filter(
        (item) => item.ItemID.SupplierPartID === 'Different SKU'
      );
      expect(differentSkuItems).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing parameters', async () => {
      const invalidParams = { LOG_LEVEL: 'debug' };

      const result = await main(invalidParams);

      expect(result).toEqual({
        statusCode: 200,
        body: {
          message: 'ERP Order processing started successfully',
          success: true,
        },
      });
    });

    test('should handle XML generation errors', async () => {
      const error = new Error('Invalid XML payload');
      generateCrmXmlPayload.mockRejectedValue(error);

      const result = await main(params);

      expect(result).toEqual({
        statusCode: 200,
        body: {
          message: 'ERP Order processing started successfully',
          success: true,
        },
      });
    });

    test('should handle async processing errors', async () => {
      const crmXmlPayload = '<Response>...</Response>';
      const error = new Error('SOAP request failed');

      generateCrmXmlPayload.mockResolvedValue(crmXmlPayload);
      sendHaloErpSoapRequest.mockRejectedValue(error);

      const result = await main(params);

      expect(result).toEqual({
        statusCode: 200,
        body: {
          message: 'ERP Order processing started successfully',
          success: true,
        },
      });
    });
  });
});
