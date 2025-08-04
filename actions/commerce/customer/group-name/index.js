const { Core } = require('@adobe/aio-sdk');
const { errorResponse, stringParameters } = require('../../../utils');
const { getAdobeCommerceClient } = require('../../../../lib/adobe-commerce');
const { HTTP_OK, HTTP_NOT_FOUND, HTTP_INTERNAL_ERROR } = require('../../../../lib/http');

/**
 * Get the customer group name
 *
 * @param {object} params the request parameters
 * @returns {string} the response
 */
async function main(params) {
  const logger = Core.Logger('get-customer-group-name', { level: params.LOG_LEVEL || 'info' });
  try {
    logger.info('Calling the get customer group name action');
    logger.debug(stringParameters(params));

    const client = await getAdobeCommerceClient(params);
    const { uid: groupUid } = params.customer || {};
    const groupId = Buffer.from(groupUid, 'base64').toString('utf-8');
    const result = await client.getCustomerGroup(groupId);
    if (!result.success) {
      return errorResponse(HTTP_NOT_FOUND, 'Customer group not found for provided uid.', logger);
    }

    return {
      statusCode: HTTP_OK,
      body: {
        id: result.message.id,
        name: result.message.code,
      },
    };
  } catch (error) {
    console.log(error);
    return errorResponse(HTTP_INTERNAL_ERROR, 'Something went wrong while retrieving customer group info.', logger);
  }
}
exports.main = main;
