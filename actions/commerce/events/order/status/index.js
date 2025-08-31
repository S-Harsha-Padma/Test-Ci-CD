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

const { Core } = require('@adobe/aio-sdk');
const { updateOrderStatus, actionErrorResponse } = require('../../../../../lib/adobe-commerce');

/**
 * Action : Cron Order Status Update
 *
 * @param {object} params - The parameters for the cron job
 * @returns {Promise<{statusCode: number, body: {message: string, summary: {totalOrders: number, successfulUpdates: number, failedUpdates: number}, details: {success: Array, failed: Array}}}|{error}>} - A promise that resolves to an object containing the status code and response body or an error
 */
async function main(params) {
  const logger = Core.Logger('main', { level: 'info' });

  try {
    logger.info('Calling the main action for erp order status');
    updateOrderStatus(params);
  } catch (error) {
    logger.error(error);
    return actionErrorResponse(error.statusCode, error);
  }
  return {
    statusCode: 200,
    body: {
      success: true,
      message: 'Orders status updated successfully',
    },
  };
}

exports.main = main;
