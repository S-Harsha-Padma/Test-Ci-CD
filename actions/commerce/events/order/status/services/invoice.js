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

/**
 * @description Create Invoice for the order
 * @param {string} orderId order id
 * @param {object} response response from the order status
 * @param {object} client commerce client
 * @param {object} logger logger instance
 * @returns {boolean} returns bool
 */
async function createInvoice(orderId, response, client, logger) {
  try {
    logger.info(`Creating invoice for order ${orderId}`);
    const createInvoiceResponse = await client.invoiceOrder(orderId);
    logger.info('createInvoiceResponse response from commerceClient Obj', createInvoiceResponse);

    if (createInvoiceResponse) {
      logger.info('Invoice created successfully for order', orderId);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error updating order status for ${orderId}:`, error.message);
    return false;
  }
}

module.exports = {
  createInvoice,
};
