const { getAdobeCommerceClient } = require('../../../lib/adobe-commerce');
const { HTTP_OK, HTTP_INTERNAL_ERROR } = require('../../../lib/http');
const { errorResponse } = require('../../utils');

/**
 * Update inventory in Commerce
 *
 * @param {Array} inventoryData inventory data
 * @param {object} params service url
 * @param {object} logger logger object
 * @returns {object} returns success or failure
 */
async function updateInventory(inventoryData, params, logger) {
  const BATCH_SIZE = 1000;
  const results = [];

  try {
    const client = await getAdobeCommerceClient(params);
    for (let i = 0; i < inventoryData.length; i += BATCH_SIZE) {
      const batch = inventoryData.slice(i, i + BATCH_SIZE);

      const sourceItems = batch.map((item) => ({
        sku: item.sku,
        source_code: 'default',
        quantity: item.qty,
        status: item.qty > 0 ? 1 : 0,
      }));
      const requestData = { sourceItems };

      logger.info(`Updating inventory for batch ${i} to ${i + batch.length - 1}`);
      const response = await client.updateInventorySourceItems(requestData);

      if (!response.success) {
        logger.error(`Batch ${i} failed: ${response.message}`);
        results.push({
          success: false,
          batchStart: i,
          batchEnd: i + batch.length - 1,
          message: response.message,
        });
        // throw new Error('Failed to update inventory source items')
      } else {
        results.push({
          success: true,
          batchStart: i,
          batchEnd: i + batch.length - 1,
          message: response.message,
        });
      }
    }

    logger.info('All batches processed.');
    return {
      statusCode: HTTP_OK,
      body: {
        success: true,
        message: `Processed ${inventoryData.length} records in batches.`,
        response: results,
      },
    };
  } catch (error) {
    logger.error(`Commerce Inventory API Error: ${error.response ? error.response.body : error.message}`);
    return errorResponse(
      HTTP_INTERNAL_ERROR,
      `Failed to update inventory.${error.response ? error.response.body : error.message}`,
      logger
    );
  }
}

module.exports = { updateInventory };
