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

const { HTTP_INTERNAL_ERROR } = require('../../../../../lib/http');
const { actionSuccessResponse, actionErrorResponse } = require('../../../../../lib/adobe-commerce');

/**
 * Logs and returns an error response
 * @param {object} logger logger instance
 * @param {string} message message
 * @param {object} context response from the invoice
 * @returns {object} return object
 */
function handleError(logger, message, context = {}) {
  logger.error(message, context);
  return actionErrorResponse(HTTP_INTERNAL_ERROR, message);
}

/**
 * Handles invoice creation and optional Authorize.net comment update
 * @param {object} commerceClient commerceClient
 * @param {number} orderId order param
 * @param {object} paymentInfo payment details
 * @param {string} authorizeMethodCode payment method code
 * @param {object} logger logger instance
 * @returns {object} return object
 */
async function handleInvoiceAndComment(commerceClient, orderId, paymentInfo, authorizeMethodCode, logger) {
  const invoiceResponse = await commerceClient.invoiceOrder(orderId);
  if (!invoiceResponse.success) {
    return handleError(logger, 'Unexpected error invoicing the order', { invoiceResponse, orderId });
  }
  return actionSuccessResponse('Invoice created successfully');
}

module.exports = {
  handleInvoiceAndComment,
};
