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
const stateLib = require('@adobe/aio-lib-state');
const { HTTP_INTERNAL_ERROR, HTTP_OK, HTTP_NOT_FOUND } = require('../../lib/http');
const { getAdobeCommerceClient } = require('../../lib/adobe-commerce');

/**
 * This function will fetch the region data from commerce
 *
 * @returns {object} - returns the region code
 * @param {string} countryCode - Country code
 * @param {number} regionId - Region id from commerce
 * @param {string} graphqlUrl - Graphql url from commerce
 * @param {object} logger - Logger object
 */
const getStateCode = async (countryCode, regionId, graphqlUrl, logger) => {
  const state = await stateLib.init();
  const storedRegionData = await state.get('regions');
  try {
    // If region data is not cached, fetch it from the API
    if (!storedRegionData?.value) {
      logger.info('Fetching new region list.');

      const graphQlUrl = `${process.env.COMMERCE_BASE_URL}${graphqlUrl}`;
      const requestBody = {
        query: `query {
            countries {
              id
              available_regions {
                id
                code
              }
            }
          }`,
      };

      const response = await fetch(graphQlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data?.data?.countries) {
        const ttlInSeconds = 365 * 24 * 60 * 60;
        await state.put('regions', JSON.stringify(data.data.countries), { ttl: ttlInSeconds });
        storedRegionData.value = JSON.stringify(data.data.countries);
        logger.info(`Stored region data for ${ttlInSeconds} seconds.`);
      } else {
        throw new Error('Directory fetch failed');
      }
    }

    // Process the stored data and find the region code
    if (storedRegionData?.value) {
      const regionParseData = JSON.parse(storedRegionData.value);
      const country = regionParseData.find((c) => c.id === countryCode);

      if (country?.available_regions) {
        const region = country.available_regions.find((r) => r.id === regionId);

        if (region) {
          logger.info(`Found region code: ${region.code}`);
          return {
            statusCode: HTTP_OK,
            body: {
              success: true,
              regionCode: region.code,
            },
          };
        }
      }
    }
  } catch (error) {
    logger.error('Error fetching directory:', error.sdkDetails?.errors);
  }
  logger.error(`Region not found for Country: ${countryCode}, Region ID: ${regionId}`);
  return {
    statusCode: HTTP_NOT_FOUND,
    body: {
      success: false,
      message: 'Region not found',
    },
  };
};

/**
 * Get the tax class name from commerce API
 *
 * @param {object} params the request parameters
 * @param {object} logger the logger object
 * @returns {string} the response
 */
const getTaxClass = async (params, logger) => {
  const state = await stateLib.init();
  let storedTaxClassData = await state.get('tax_classes');

  try {
    // If tax class data is not cached, fetch it from the API
    if (!storedTaxClassData?.value) {
      logger.info('Fetching new tax class list.');
      const attrCode = 'tax_class_id';
      const client = await getAdobeCommerceClient(params);
      const commerceResponse = await client.getAttributeByCode(attrCode);
      if (!commerceResponse.success) {
        throw new Error(`Failed to fetch tax class data`);
      }

      const data = commerceResponse?.message;

      if (data?.options?.length) {
        const taxClassOptions = Object.fromEntries(data.options.map((option) => [option.value, option.label]));

        // Store in stateLib with a long TTL
        const ttlInSeconds = 30 * 24 * 60 * 60; // 30 days
        await state.put('tax_classes', JSON.stringify(taxClassOptions), { ttl: ttlInSeconds });
        storedTaxClassData = taxClassOptions;
      }
    } else {
      logger.info('Using stored tax class list.');
      storedTaxClassData = JSON.parse(storedTaxClassData.value);
    }

    return {
      statusCode: HTTP_OK,
      body: {
        success: true,
        tax_classes: storedTaxClassData,
      },
    };
  } catch (error) {
    logger.error('Error fetching tax class data:', error);
    return {
      statusCode: HTTP_INTERNAL_ERROR,
      body: {
        success: false,
        message: 'Internal server error occurred while fetching tax class data',
      },
    };
  }
};

/**
 * Fetch HTS codes from Adobe Commerce for the given SKUs
 *
 * @param {Array<string>} skus - List of product SKUs
 * @param {object} params - Params containing commerce connection info
 * @param {object} logger - Logger instance
 * @returns {object} Map of sku -> hts_code
 */
const getHtsCodesFromCommerce = async (skus, params, logger) => {
  const htsCodeMap = {};
  if (!skus.length) return htsCodeMap;

  const state = await stateLib.init();
  const cacheKey = 'hts_codes_cache';
  const storedHtsCodeData = await state.get(cacheKey);
  const cachedHtsCodes = storedHtsCodeData?.value ? JSON.parse(storedHtsCodeData.value) : {};
  const uncachedSkus = skus.filter((sku) => !cachedHtsCodes[sku]);
  // Use cached HTS codes if available
  skus.forEach((sku) => {
    if (cachedHtsCodes[sku]) {
      htsCodeMap[sku] = cachedHtsCodes[sku];
    }
  });

  // If some SKUs are missing in cache, fetch them
  if (uncachedSkus.length) {
    logger.info(`Fetching HTS codes from Commerce for SKUs: ${uncachedSkus.join(', ')}`);
    const client = await getAdobeCommerceClient(params);
    const response = await client.getProductsBySku(uncachedSkus.join(','));

    if (!response.success || !response.message) {
      throw new Error('Hts attribute: No product details found for given product SKUs');
    }

    response?.message?.items?.forEach((product) => {
      const htsCode = product?.custom_attributes?.find((attr) => attr.attribute_code === 'hts_code')?.value;
      if (htsCode) {
        cachedHtsCodes[product.sku] = htsCode;
        htsCodeMap[product.sku] = htsCode;
      }
    });

    // The cache with a long TTL (30 days)
    const ttlInSeconds = 2592000;
    await state.put(cacheKey, JSON.stringify(cachedHtsCodes), { ttl: ttlInSeconds });
  } else {
    logger.info('Using cached HTS code data');
  }

  return htsCodeMap;
};

module.exports = {
  getStateCode,
  getTaxClass,
  getHtsCodesFromCommerce,
};
