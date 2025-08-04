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

/**
 * Get Warehouse Shipping Method
 * @param {object} params - params
 * @returns {Array} - return warehouse shipping methods
 */
function getWarehouseShippingMethod(params) {
  const shippingMethods = [];
  if (params.rateRequest?.dest_country_id === 'US') {
    shippingMethods.push(
      createShippingOperation({
        carrier_code: params.WAREHOUSE_PICKUP_CARRIER_CODE,
        method: params.WAREHOUSE_PICKUP_METHOD_CODE,
        method_title: params.WAREHOUSE_PICKUP_METHOD_TITLE,
        price: 0,
        cost: 0,
        additional_data: [
          {
            key: 'shipping_method',
            value: params.WAREHOUSE_PICKUP_METHOD_CODE,
          },
          {
            key: 'address',
            value: ['Free pickup at BrandVia Warehouse', '1943 Lundy Ave', 'San Jose, CA, USA, 95131'].join('\n'),
          },
        ],
      })
    );
  }
  return shippingMethods;
}

module.exports = {
  getWarehouseShippingMethod,
};
