const { validateShippingRestrictions } = require('../../../../../actions/commerce/webhook/shipping/validation');
const { getAdobeCommerceClient } = require('../../../../../lib/adobe-commerce');

jest.mock('../../../../../lib/adobe-commerce');

describe('validateShippingRestrictions', () => {
  let logger;
  let client;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
    };
    client = {
      getProductsBySku: jest.fn(),
    };
    getAdobeCommerceClient.mockResolvedValue(client);
    jest.clearAllMocks();
  });

  test('should not throw an error if no shipping restrictions are found', async () => {
    const params = {
      rateRequest: {
        dest_country_id: 'US',
        all_items: [
          { product_type: 'simple', product: { sku: 'sku1', attributes: { eligible_shipping_countries: 'US' } } },
        ],
      },
    };

    client.getProductsBySku.mockResolvedValue({
      success: true,
      message: { items: [] },
    });

    await expect(validateShippingRestrictions(params, logger)).resolves.not.toThrow();
  });

  test('should throw an error if restricted SKUs are found', async () => {
    const params = {
      rateRequest: {
        dest_country_id: 'CA',
        all_items: [
          { product_type: 'simple', product: { sku: 'sku1', attributes: { eligible_shipping_countries: 'US' } } },
        ],
      },
    };

    client.getProductsBySku.mockResolvedValue({
      success: true,
      message: { items: [] },
    });

    await expect(validateShippingRestrictions(params, logger)).rejects.toThrow(
      'The following products cannot be shipped to CA: sku1'
    );
  });

  test('should throw an error if no product details are found for given SKUs', async () => {
    const params = {
      rateRequest: {
        dest_country_id: 'US',
        all_items: [{ product_type: 'configurable', product: { sku: 'sku1' } }],
      },
    };

    client.getProductsBySku.mockResolvedValue({
      success: false,
      message: null,
    });

    await expect(validateShippingRestrictions(params, logger)).rejects.toThrow(
      'No product details found for given product SKUs'
    );
  });

  test('should log debug messages for identified shipping country and product SKUs', async () => {
    const params = {
      rateRequest: {
        dest_country_id: 'US',
        all_items: [{ product_type: 'configurable', product: { sku: 'sku1' } }],
      },
    };

    client.getProductsBySku.mockResolvedValue({
      success: true,
      message: { items: [] },
    });

    await validateShippingRestrictions(params, logger);

    expect(logger.debug).toHaveBeenCalledWith('Shipping country identified: US');
    expect(logger.debug).toHaveBeenCalledWith("Product Sku's to retrieve details from commerce: sku1");
  });

  test('should handle shipping restrictions for configurable products with custom attributes', async () => {
    const params = {
      rateRequest: {
        dest_country_id: 'CA',
        all_items: [
          {
            product_type: 'configurable',
            product: { sku: 'config-sku' },
          },
        ],
      },
    };

    client.getProductsBySku.mockResolvedValue({
      success: true,
      message: {
        items: [
          {
            sku: 'config-sku',
            custom_attributes: [
              {
                attribute_code: 'eligible_shipping_countries',
                value: 'US,MX',
              },
            ],
          },
        ],
      },
    });

    await expect(validateShippingRestrictions(params, logger)).rejects.toThrow(
      'The following products cannot be shipped to CA: config-sku'
    );
  });
});
