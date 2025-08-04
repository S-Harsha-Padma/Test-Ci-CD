const { HTTP_OK } = require('../../../../lib/http');
const { getProductBySku, getCustomerGroupById } = require('../../../../lib/aio-state');
const { Core } = require('@adobe/aio-sdk');
const { webhookErrorResponseWithException, webhookVerify } = require('../../../../lib/adobe-commerce');

/**
 * Validate add to card
 *
 * @param {object} params the request parameters
 * @returns {string} the response
 */
async function main(params) {
  const logger = Core.Logger('add-to-card-validation', { level: params.LOG_LEVEL || 'info' });
  try {
    const { success, error } = webhookVerify(params);
    if (!success) {
      logger.error(`Failed to verify the webhook signature: ${error}`);
      return webhookErrorResponseWithException(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      );
    }
    const body = JSON.parse(atob(params.__ow_body));
    const productData = body.data.quote_item.product;
    const productType = productData.type_id;
    let selectedSku;

    if (productType === 'bundle') {
      const usedSelections = productData._cache_instance_used_selections || {};
      const usedSelectionIds = productData._cache_instance_used_selections_ids || [];
      const selectedSkus = usedSelectionIds.map((id) => usedSelections[id]?.sku).filter(Boolean);
      // Since only a single selection is allowed, get the first (and only) one
      selectedSku = selectedSkus[0];
    } else {
      // For simple, configurable, etc.
      selectedSku = body.data.quote_item.sku;
    }
    const product = await getProductBySku(params, selectedSku, logger);
    const productCustomerGroup = product.custom_attributes.find((attr) => attr.attribute_code === 'customer_group');
    if (productCustomerGroup) {
      const currentCustomerGroupId = body.customer?.customer_group_id;
      const currentCustomerGroup = await getCustomerGroupById(params, logger, currentCustomerGroupId);
      if (productCustomerGroup.value !== currentCustomerGroup) {
        return webhookErrorResponseWithException(
          `Oops! This item is only available for Adobe employees. Please sign in with an authorized account to continue.`
        );
      }
    }
    return {
      statusCode: HTTP_OK,
      body: {
        op: 'success',
      },
    };
  } catch (e) {
    logger.error('Error validating product access:', e);
    return webhookErrorResponseWithException(`An unexpected error occurred while validating the product access.`);
  }
}
exports.main = main;
