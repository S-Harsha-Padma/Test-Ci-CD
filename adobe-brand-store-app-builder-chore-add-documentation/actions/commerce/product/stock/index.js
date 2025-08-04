const { Core } = require('@adobe/aio-sdk');
const { errorResponse } = require('../../../utils');
const { getAdobeCommerceClient } = require('../../../../lib/adobe-commerce');
const { HTTP_OK, HTTP_INTERNAL_ERROR } = require('../../../../lib/http');
const PRODUCT_TYPE_BUNDLE = 'bundle';

/**
 * Validate address
 *
 * @param {object} params the request parameters
 * @returns {string} the response
 */
async function main(params) {
  const logger = Core.Logger('product-stock', { level: params.LOG_LEVEL || 'info' });
  try {
    const client = await getAdobeCommerceClient(params);

    if (params.product_type && params.product_type === PRODUCT_TYPE_BUNDLE) {
      const childSkuQuantity = await client.getBundleChildProductSalableQuantity(params.child_sku);
      const items = childSkuQuantity?.message?.items ?? [];
      const sortedItems = items.sort((a, b) => a.quantity - b.quantity);
      const lowestQuantityItem = sortedItems.length > 0 ? sortedItems[0] : { quantity: 0 };
      return {
        statusCode: HTTP_OK,
        body: {
          qty: lowestQuantityItem?.quantity ?? 0,
        },
      };
    } else {
      const quantity = await client.getProductSalableQuantity(params.sku);
      return {
        statusCode: HTTP_OK,
        body: {
          qty: quantity.message ?? 0,
        },
      };
    }
  } catch (error) {
    return errorResponse(
      HTTP_INTERNAL_ERROR,
      'Something went wrong while retrieving product stock information.',
      logger
    );
  }
}
exports.main = main;
