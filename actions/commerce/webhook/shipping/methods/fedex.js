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
const { getCustomerGroupById } = require('../../../../../lib/aio-state');

/**
 * Get Fedex Shipping Methods from Code
 *
 * @param {object} params - params.
 * @param {object} customer - customer.
 * @param {object} logger - logger.
 * @returns {Array} return shipping methods.
 */
async function getFedExShippingMethods(params, customer, logger) {
  const shippingMethods = [];
  const shippingCountry = params.rateRequest?.dest_country_id;
  let type = 'FEDEX';
  if (shippingCountry !== 'US') {
    type = 'FEDEX_INTL';
  }

  logger.info('FEDEX_METHODS', params.FEDEX_METHODS);
  const methodList = JSON.parse(params.FEDEX_METHODS);
  const customerGroupCode = await getCustomerGroupById(params, logger, customer?.group_id);
  logger.info('Customer Group ID', customerGroupCode);
  if (
    customer !== null &&
    typeof customer === 'object' &&
    Object.prototype.hasOwnProperty.call(customer, 'group_id') &&
    [params.CUSTOMER_GROUP_CODE, params.PO_FEDEX_CUSTOMER_GROUP].includes(customerGroupCode)
  ) {
    if (customerGroupCode === params.PO_FEDEX_CUSTOMER_GROUP) {
      params.FEDEX_SHIPPING_PRODUCT_PRICE = 0;
    }
    methodList[type].forEach((method) => {
      shippingMethods.push(
        createShippingOperation({
          carrier_code: params.FEDEX_CODE,
          method: method.method_code,
          method_title: method.method_title,
          price: params.FEDEX_SHIPPING_PRODUCT_PRICE,
          cost: params.FEDEX_SHIPPING_PRODUCT_PRICE,
          additional_data: [
            {
              key: 'shipping_method',
              value: method.method_code,
            },
            {
              key: 'shipping_description',
              value:
                'Bill to Adobe’s FedEx account for business orders only: $2.95 will be added to your order for processing and the shipping cost will be billed separately to your cost center',
            },
          ],
        })
      );
    });
  }
  return shippingMethods;
}

module.exports = {
  getFedExShippingMethods,
};
