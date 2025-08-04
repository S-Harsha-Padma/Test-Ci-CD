const stateLib = require('@adobe/aio-lib-state');
const { getStateCode, getTaxClass, getHtsCodesFromCommerce } = require('../../../actions/commerce/aio-state');
const { HTTP_OK, HTTP_NOT_FOUND } = require('../../../lib/http');
const { getAdobeCommerceClient } = require('../../../lib/adobe-commerce');

jest.mock('@adobe/aio-lib-state');
jest.mock('../../../lib/adobe-commerce');
global.fetch = jest.fn();

describe('Your module unit tests', () => {
  let mockState;
  let logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    mockState = {
      get: jest.fn(),
      put: jest.fn(),
    };
    stateLib.init.mockResolvedValue(mockState);

    jest.clearAllMocks();
  });

  describe('getStateCode', () => {
    const graphqlUrl = '/graphql';
    const countryCode = 'US';
    const regionId = 5;

    it('should fetch and cache region data when no cache exists, and return the correct region code', async () => {
      mockState.get.mockResolvedValueOnce({});

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: {
            countries: [
              {
                id: 'US',
                available_regions: [{ id: 5, code: 'CA' }],
              },
            ],
          },
        }),
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await getStateCode(countryCode, regionId, graphqlUrl, logger);

      expect(fetch).toHaveBeenCalled();
      expect(mockState.put).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: HTTP_OK,
        body: { success: true, regionCode: 'CA' },
      });
    });

    it('should return region code from cached data', async () => {
      const cachedRegions = JSON.stringify([{ id: 'US', available_regions: [{ id: 5, code: 'CA' }] }]);
      mockState.get.mockResolvedValueOnce({ value: cachedRegions });

      const result = await getStateCode(countryCode, regionId, graphqlUrl, logger);

      expect(fetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: HTTP_OK,
        body: { success: true, regionCode: 'CA' },
      });
    });

    it('should return NOT_FOUND when region is not found', async () => {
      mockState.get.mockResolvedValueOnce({ value: JSON.stringify([{ id: 'US', available_regions: [] }]) });

      const result = await getStateCode(countryCode, regionId, graphqlUrl, logger);

      expect(result).toEqual({
        statusCode: HTTP_NOT_FOUND,
        body: { success: false, message: 'Region not found' },
      });
    });
  });

  describe('getTaxClass', () => {
    const params = { some: 'param' };

    it('should fetch and cache tax class data when no cache exists', async () => {
      mockState.get.mockResolvedValueOnce({}); // no cache
      const mockClient = {
        getAttributeByCode: jest.fn().mockResolvedValue({
          success: true,
          message: {
            options: [
              { value: '1', label: 'Taxable Goods' },
              { value: '2', label: 'Shipping' },
            ],
          },
        }),
      };
      getAdobeCommerceClient.mockResolvedValue(mockClient);

      const result = await getTaxClass(params, logger);

      expect(mockClient.getAttributeByCode).toHaveBeenCalledWith('tax_class_id');
      expect(mockState.put).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: HTTP_OK,
        body: {
          success: true,
          tax_classes: { 1: 'Taxable Goods', 2: 'Shipping' },
        },
      });
    });

    it('should return tax class data from cache', async () => {
      mockState.get.mockResolvedValueOnce({ value: JSON.stringify({ 1: 'Taxable Goods' }) });

      const result = await getTaxClass(params, logger);

      expect(result).toEqual({
        statusCode: HTTP_OK,
        body: {
          success: true,
          tax_classes: { 1: 'Taxable Goods' },
        },
      });
    });
  });

  describe('getHtsCodesFromCommerce', () => {
    const params = { commerce: 'param' };
    const skus = ['sku1', 'sku2'];

    it('should return cached HTS codes if available', async () => {
      mockState.get.mockResolvedValueOnce({ value: JSON.stringify({ sku1: 'HTS1', sku2: 'HTS2' }) });

      const result = await getHtsCodesFromCommerce(skus, params, logger);

      expect(result).toEqual({ sku1: 'HTS1', sku2: 'HTS2' });
    });

    it('should fetch HTS codes for uncached SKUs', async () => {
      mockState.get.mockResolvedValueOnce({ value: JSON.stringify({ sku1: 'HTS1' }) });

      const mockClient = {
        getProductsBySku: jest.fn().mockResolvedValue({
          success: true,
          message: {
            items: [{ sku: 'sku2', custom_attributes: [{ attribute_code: 'hts_code', value: 'HTS2' }] }],
          },
        }),
      };
      getAdobeCommerceClient.mockResolvedValue(mockClient);

      const result = await getHtsCodesFromCommerce(skus, params, logger);

      expect(result).toEqual({ sku1: 'HTS1', sku2: 'HTS2' });
      expect(mockState.put).toHaveBeenCalled();
    });

    it('should return empty map if no skus provided', async () => {
      const result = await getHtsCodesFromCommerce([], params, logger);
      expect(result).toEqual({});
    });

    it('should throw error if fetch HTS fails', async () => {
      mockState.get.mockResolvedValueOnce({ value: '{}' });

      const mockClient = {
        getProductsBySku: jest.fn().mockResolvedValue({ success: false }),
      };
      getAdobeCommerceClient.mockResolvedValue(mockClient);

      await expect(getHtsCodesFromCommerce(skus, params, logger)).rejects.toThrow(
        'Hts attribute: No product details found for given product SKUs'
      );
    });
  });
});
