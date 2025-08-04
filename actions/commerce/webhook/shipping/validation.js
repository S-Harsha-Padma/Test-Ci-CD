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
const { getAdobeCommerceClient } = require('../../../../lib/adobe-commerce');

/**
 * Get Usps Shipping Method
 * @param {object} params - params
 * @param {object} logger - logger
 * @returns {Array} - return Usps shipping methods
 */
async function validateShippingRestrictions(params, logger) {
  const shippingCountry = params.rateRequest?.dest_country_id;
  if (shippingCountry) {
    logger.debug(`Shipping country identified: ${shippingCountry}`);
    const restrictedSkus = [];

    // Retrieve the SKU of configurable parent products.
    // Currently, the child products of configurable do not have a value for the eligible_shipping_countries attribute.
    // To ensure proper validation, we need to check the parent configurable product for this attribute.
    // If the child product has a eligible_shipping_countries value, the validation will apply for both.
    const productSku = params.rateRequest?.all_items
      .filter((item) => item.product_type === 'configurable')
      .map((item) => item?.product.sku || []);
    if (productSku.length) {
      const productSkuList = productSku.join(',');
      logger.debug(`Product Sku's to retrieve details from commerce: ${productSkuList}`);

      /**
       * Initiate commerce client
       */
      const client = await getAdobeCommerceClient(params);

      /**
       * Get product details by sku
       */
      const commerceResponse = await client.getProductsBySku(productSkuList);
      if (!commerceResponse.success || !commerceResponse.message) {
        throw new Error('No product details found for given product SKUs');
      }

      commerceResponse?.message?.items?.forEach((product) => {
        const shippedOnly = product?.custom_attributes?.find(
          (attr) => attr.attribute_code === 'eligible_shipping_countries'
        )?.value;
        if (
          shippedOnly &&
          !shippedOnly
            .split(',')
            .map((c) => c.trim())
            .includes(shippingCountry)
        ) {
          restrictedSkus.push(product.sku);
        }
      });
    }
    // Check shipping restrictions for non-configurable & parent-bundle product
    params.rateRequest?.all_items?.forEach((item) => {
      const product = item?.product;
      if (
        product &&
        !['configurable', 'bundle'].includes(item.product_type) &&
        product?.attributes?.eligible_shipping_countries
      ) {
        const shippedOnly = product.attributes?.eligible_shipping_countries;
        if (
          shippedOnly &&
          !shippedOnly
            .split(',')
            .map((c) => c.trim())
            .includes(shippingCountry)
        ) {
          restrictedSkus.push(product.sku);
        }
      }
    });

    // Return error if any restricted SKUs are found
    if (restrictedSkus.length) {
      logger.debug(`The following products cannot be shipped to ${shippingCountry}: ${restrictedSkus.join(', ')}`);
      throw new Error(`The following products cannot be shipped to ${shippingCountry}: ${restrictedSkus.join(', ')}`);
    }
  }
}

module.exports = {
  validateShippingRestrictions,
};
