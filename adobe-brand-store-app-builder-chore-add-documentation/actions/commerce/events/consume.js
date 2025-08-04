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
const { HTTP_OK } = require('../../../lib/http');
const { orderCreated } = require('./order/create/index');
/**
 * Events consumer for Adobe Commerce Event provider. Routes the events through the appropriate handler according to
 * the event code.
 * @param {object} params - The input parameters for the action.
 * @returns {object} The response object
 */
async function main(params) {
  const logger = Core.Logger('commerce-events/consume', { level: params.LOG_LEVEL || 'info' });
  // params.type = 'com.adobe.commerce.observer.sales_order_save_commit_after';
  logger.info('Received event:', params.type);
  switch (params.type) {
    case 'com.adobe.commerce.observer.sales_order_save_commit_after':
      return orderCreated(params);
    default:
      return { statusCode: HTTP_OK };
  }
}

exports.main = main;
