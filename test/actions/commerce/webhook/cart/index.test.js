const { main } = require('../../../../../actions/commerce/webhook/cart/discounts/index');
const { getCustomerGroupById } = require('../../../../../lib/aio-state');
const { HTTP_OK } = require('../../../../../lib/http');
const {
  webhookErrorResponseWithException,
  webhookVerify,
  webhookSuccessResponse,
} = require('../../../../../lib/adobe-commerce');

jest.mock('../../../../../lib/aio-state');
jest.mock('../../../../../lib/adobe-commerce');

describe('Cart Discounts Webhook', () => {
  let params;

  beforeEach(() => {
    params = {
      LOG_LEVEL: 'info',
      __ow_body: btoa(
        JSON.stringify({
          data: {
            quote: {
              customer_group_id: 1,
              gift_cards: '[{"i":1,"c":"TESTCODE","a":100}]',
              coupon_code: 'TESTCOUPON',
            },
          },
        })
      ),
    };

    jest.clearAllMocks();
  });

  describe('Webhook Verification', () => {
    it('should return error when webhook signature verification fails', async () => {
      webhookVerify.mockReturnValue({ success: false, error: 'Invalid signature' });
      webhookErrorResponseWithException.mockReturnValue({
        statusCode: 400,
        body: JSON.stringify({ error: 'Webhook signature Error' }),
      });

      const result = await main(params);

      expect(webhookVerify).toHaveBeenCalledWith(params);
      expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      );
      expect(result).toEqual({
        statusCode: 400,
        body: JSON.stringify({ error: 'Webhook signature Error' }),
      });
    });

    it('should proceed when webhook signature verification succeeds', async () => {
      webhookVerify.mockReturnValue({ success: true });
      getCustomerGroupById.mockResolvedValue('Regular Customer');
      webhookSuccessResponse.mockReturnValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });

      const result = await main(params);

      expect(webhookVerify).toHaveBeenCalledWith(params);
      expect(getCustomerGroupById).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });
    });
  });

  describe('Customer Group Handling', () => {
    beforeEach(() => {
      webhookVerify.mockReturnValue({ success: true });
    });

    it('should remove gift cards and coupon codes for CBRE Personnel', async () => {
      getCustomerGroupById.mockResolvedValue('CBRE Personnel');

      const result = await main(params);

      expect(getCustomerGroupById).toHaveBeenCalledWith(params, expect.any(Object), 1);
      expect(result).toEqual({
        statusCode: HTTP_OK,
        body: JSON.stringify([
          {
            op: 'replace',
            path: 'data/quote/gift_cards',
            value: null,
          },
          {
            op: 'replace',
            path: 'data/quote/coupon_code',
            value: null,
          },
        ]),
      });
    });

    it('should remove gift cards and coupon codes for Purchase Order Eligible', async () => {
      getCustomerGroupById.mockResolvedValue('Purchase Order Eligible');

      const result = await main(params);

      expect(getCustomerGroupById).toHaveBeenCalledWith(params, expect.any(Object), 1);
      expect(result).toEqual({
        statusCode: HTTP_OK,
        body: JSON.stringify([
          {
            op: 'replace',
            path: 'data/quote/gift_cards',
            value: null,
          },
          {
            op: 'replace',
            path: 'data/quote/coupon_code',
            value: null,
          },
        ]),
      });
    });

    it('should return success response for other customer groups', async () => {
      getCustomerGroupById.mockResolvedValue('Regular Customer');
      webhookSuccessResponse.mockReturnValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });

      const result = await main(params);

      expect(getCustomerGroupById).toHaveBeenCalledWith(params, expect.any(Object), 1);
      expect(webhookSuccessResponse).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    it('should handle different customer group IDs', async () => {
      params.__ow_body = btoa(
        JSON.stringify({
          data: {
            quote: {
              customer_group_id: 5,
            },
          },
        })
      );
      getCustomerGroupById.mockResolvedValue('VIP Customer');
      webhookSuccessResponse.mockReturnValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });

      const result = await main(params);

      expect(getCustomerGroupById).toHaveBeenCalledWith(params, expect.any(Object), 5);
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      webhookVerify.mockReturnValue({ success: true });
    });

    it('should handle errors when getting customer group fails', async () => {
      getCustomerGroupById.mockRejectedValue(new Error('Database error'));
      webhookErrorResponseWithException.mockReturnValue({
        statusCode: 500,
        body: JSON.stringify({ error: 'Unexpected error' }),
      });

      const result = await main(params);

      expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
        'An unexpected error occurred while removing coupon and gift card.'
      );
      expect(result).toEqual({
        statusCode: 500,
        body: JSON.stringify({ error: 'Unexpected error' }),
      });
    });

    it('should handle malformed request body', async () => {
      params.__ow_body = btoa('invalid json');
      webhookErrorResponseWithException.mockReturnValue({
        statusCode: 500,
        body: JSON.stringify({ error: 'Unexpected error' }),
      });

      const result = await main(params);

      expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
        'An unexpected error occurred while removing coupon and gift card.'
      );
      expect(result).toEqual({
        statusCode: 500,
        body: JSON.stringify({ error: 'Unexpected error' }),
      });
    });

    it('should handle missing quote data', async () => {
      params.__ow_body = btoa(
        JSON.stringify({
          data: {},
        })
      );
      getCustomerGroupById.mockResolvedValue('Regular Customer');
      webhookSuccessResponse.mockReturnValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });

      const result = await main(params);

      expect(getCustomerGroupById).toHaveBeenCalledWith(params, expect.any(Object), undefined);
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });
    });
  });
});
