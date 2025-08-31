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
const { createShippingOperation } = require('../../../../../lib/adobe-commerce');
const { getCustomerGroupIdFromCode } = require('../../../../../lib/aio-state');

/**
 * Get Carrier Shipping Method
 * @param {object} params - params
 * @param {object} customer - customer
 * @param {object} logger - logger
 * @returns {Array} - return Carrier shipping methods
 */
async function getCarrierShippingMethod(params, customer, logger) {
  const shippingMethods = [];
  const customerGroupId = await getCustomerGroupIdFromCode(params, logger);

  if (
    customer !== null &&
    typeof customer === 'object' &&
    Object.prototype.hasOwnProperty.call(customer, 'group_id') &&
    String(customer.group_id) === String(customerGroupId)
  ) {
    shippingMethods.push(
      createShippingOperation({
        carrier_code: params.CARRIER_CODE,
        method: params.SHIPPING_METHOD_CODE,
        method_title: params.SHIPPING_METHOD_TITLE,
        price: 0,
        cost: 0,
        additional_data: [
          {
            key: 'shipping_method',
            value: params.SHIPPING_METHOD_CODE,
          },
          {
            key: 'address',
            value: ['Weekly Courier to San Jose Towers', '345 Park Ave, San Jose', 'CA, 95110, USA'].join('\n'),
          },
        ],
      })
    );
  }
  return shippingMethods;
}

module.exports = {
  getCarrierShippingMethod,
};
