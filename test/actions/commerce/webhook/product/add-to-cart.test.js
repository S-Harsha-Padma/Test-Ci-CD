const { main } = require('../../../../../actions/commerce/webhook/product/add-to-cart');
const { getProductBySku, getCustomerGroupById } = require('../../../../../lib/aio-state');
const {
  webhookVerify,
  webhookErrorResponseWithException,
  getAdobeCommerceClient,
} = require('../../../../../lib/adobe-commerce');
const { HTTP_OK } = require('../../../../../lib/http');

jest.mock('../../../../../lib/aio-state', () => ({
  getProductBySku: jest.fn(),
  getCustomerGroupById: jest.fn(),
}));
jest.mock('../../../../../lib/adobe-commerce');

describe('main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseParams = {
    __ow_body: '',
    LOG_LEVEL: 'debug',
  };

  it('should return success if customer group is valid or not specified', async () => {
    const params = {
      ...baseParams,
      __ow_body: Buffer.from(
        JSON.stringify({
          data: {
            quote_item: {
              product: {
                type_id: 'simple',
                sku: 'test-sku',
              },
              sku: 'test-sku',
            },
            customer: {
              customer_group_id: 'general',
            },
          },
        })
      ).toString('base64'),
    };

    webhookVerify.mockReturnValue({ success: true });
    getAdobeCommerceClient.mockResolvedValue({
      getProductsBySku: jest.fn().mockResolvedValue({
        message: {
          items: [
            {
              custom_attributes: [],
            },
          ],
        },
      }),
    });
    getProductBySku.mockResolvedValue({
      custom_attributes: [],
    });
    const result = await main(params);

    expect(result.statusCode).toBe(HTTP_OK);
    expect(result.body.op).toBe('success');
  });

  it('should fail when webhook signature is invalid', async () => {
    webhookVerify.mockReturnValue({ success: false, error: 'Invalid signature' });
    getProductBySku.mockResolvedValue({
      custom_attributes: [{ attribute_code: 'customer_group', value: 'Employee' }],
    });
    const result = await main(baseParams);

    expect(result).toEqual(
      webhookErrorResponseWithException(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      )
    );
  });

  it('should reject access if customer group does not match', async () => {
    const params = {
      ...baseParams,
      __ow_body: Buffer.from(
        JSON.stringify({
          data: {
            quote_item: {
              sku: 'test-sku',
            },
            customer: {
              customer_group_id: 'guest',
            },
          },
        })
      ).toString('base64'),
    };

    webhookVerify.mockReturnValue({ success: true });
    getAdobeCommerceClient.mockResolvedValue({
      getProductsBySku: jest.fn().mockResolvedValue({
        message: {
          items: [
            {
              custom_attributes: [{ attribute_code: 'customer_group', value: 'adobe' }],
            },
          ],
        },
      }),
    });
    getCustomerGroupById.mockResolvedValue('guest');
    getProductBySku.mockResolvedValue({
      custom_attributes: [{ attribute_code: 'customer_group', value: 'Employee' }],
    });
    const result = await main(params);

    expect(result).toEqual(
      webhookErrorResponseWithException(
        `Oops! This item is only available for Adobe employees. Please sign in with an authorized account to continue.`
      )
    );
  });

  it('should handle unexpected errors gracefully', async () => {
    webhookVerify.mockReturnValue({ success: true });
    getAdobeCommerceClient.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const params = {
      ...baseParams,
      __ow_body: Buffer.from(
        JSON.stringify({
          data: {
            quote_item: {
              sku: 'test-sku',
            },
            customer: {
              customer_group_id: 'guest',
            },
          },
        })
      ).toString('base64'),
    };
    getProductBySku.mockResolvedValue({
      custom_attributes: [{ attribute_code: 'customer_group', value: 'Employee' }],
    });
    const result = await main(params);

    expect(result).toEqual(
      webhookErrorResponseWithException(`An unexpected error occurred while validating the product access.`)
    );
  });
});
