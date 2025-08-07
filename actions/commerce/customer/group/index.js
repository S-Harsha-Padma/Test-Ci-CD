const { Core } = require('@adobe/aio-sdk');
const { errorResponse } = require('../../../utils');
const { getAdobeCommerceClient } = require('../../../../lib/adobe-commerce');
const { HTTP_OK, HTTP_NOT_FOUND, HTTP_INTERNAL_ERROR } = require('../../../../lib/http');
const crypto = require('crypto');

/**
 * Validate address
 *
 * @param {object} params the request parameters
 * @returns {string} the response
 */
async function main(params) {
  const logger = Core.Logger('customer-group', { level: params.LOG_LEVEL || 'info' });
  return errorResponse(HTTP_NOT_FOUND, params.LOG_LEVEL, logger);
  try {
    const client = await getAdobeCommerceClient(params);
    const result = await client.getCustomer(params.email);
    const customerGroupId = result.message.items.length > 0 ? result.message.items[0].group_id : null;
    if (customerGroupId) {
      return {
        statusCode: HTTP_OK,
        body: {
          customer_group: crypto.createHash('sha1').update(String(customerGroupId)).digest('hex'),
        },
      };
    }
    return errorResponse(HTTP_NOT_FOUND, 'Customer group not found.', logger);
  } catch (error) {
    console.log(error);
    return errorResponse(HTTP_INTERNAL_ERROR, 'Something went wrong while retrieving customer information.', logger);
  }
}
exports.main = main;
