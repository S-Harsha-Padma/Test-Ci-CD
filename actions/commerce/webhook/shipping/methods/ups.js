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
const got = require('got');
const { getAccessToken } = require('../../../../ups/http/client');
const { createShippingOperation } = require('../../../../../lib/adobe-commerce');
const { getStateCode } = require('../../../aio-state');
const stateLib = require('@adobe/aio-lib-state');
const { getSurepostShippingMethod } = require('./service/surepost');
const { checkMissingRequestInputs } = require('../../../../utils');

// Constants for shipping methods
const UPS_SHIPPING_METHODS = {
  '01': { code: 'ups_next_day_air', title: 'UPS Next Day Air' },
  '02': { code: 'ups_2nd_day_air', title: 'UPS Second Day Air' },
  '03': { code: 'ups_ground', title: 'UPS Ground' },
  '08': { code: 'ups_expedited', title: 'UPS Worldwide Expedited' },
  '07': { code: 'ups_express', title: 'UPS Worldwide Express' },
  65: { code: 'ups_express_saver', title: 'UPS Worldwide Saver' },
  12: { code: 'ups_3_day_select', title: 'UPS Three-Day Select' },
};

const SUREPOST_SHIPPING_METHODS = {
  92: { code: 'ups_ground_saver', title: 'UPS Ground Saver' },
};

const CACHE_TTL_SECONDS = 60 * 5; // 5-minute buffer before expiration
const UPS_CACHE_SALT = 333;

/**
 * Calculate adjusted rate based on domestic/international rules
 * @param {number} baseRate - The base rate from UPS
 * @param {object} params - Parameters containing rate adjustment percentages
 * @param {string} destCountryId - Destination country ID
 * @returns {number} - Adjusted rate
 */
function calculateAdjustedRate(baseRate, params, destCountryId) {
  const isDomestic = destCountryId === 'US';
  return isDomestic
    ? baseRate * params.UPS_DOMESTIC_PAY_PERCENTAGE
    : baseRate * params.UPS_INTERNATIONAL_PAY_PERCENTAGE;
}

/**
 * Create and add shipping method to array
 * @param {Array} shippingMethods - Array to add shipping method to
 * @param {object} params - Parameters
 * @param {string} methodCode - Method code
 * @param {string} methodTitle - Method title
 * @param {number} adjustedRate - Adjusted rate
 */
function addShippingMethod(shippingMethods, params, methodCode, methodTitle, adjustedRate) {
  shippingMethods.push(
    createShippingOperation({
      carrier_code: params.UPS_CARRIER_CODE,
      method: methodCode,
      method_title: methodTitle,
      price: adjustedRate,
      cost: adjustedRate,
      additional_data: [],
    })
  );
}

/**
 * Process UPS rated shipments and add to shipping methods
 * @param {Array} ratedShipments - UPS rated shipments
 * @param {Array} shippingMethods - Array to add methods to
 * @param {object} params - Parameters
 * @param {object} logger - Logger instance
 */
function processUpsRatedShipments(ratedShipments, shippingMethods, params, logger) {
  const destCountryId = params.rateRequest?.dest_country_id;

  ratedShipments.forEach((element) => {
    const serviceCode = element.Service.Code;
    const shippingMethodConfig = UPS_SHIPPING_METHODS[serviceCode];

    if (!shippingMethodConfig) {
      return; // Skip unknown service codes
    }

    // Filter ups_express_saver to only show for MX and CA
    if (serviceCode === '65' && !['MX', 'CA'].includes(destCountryId)) {
      return;
    }

    const baseRate = parseFloat(element.TotalCharges.MonetaryValue);
    const adjustedRate = calculateAdjustedRate(baseRate, params, destCountryId);

    addShippingMethod(shippingMethods, params, shippingMethodConfig.code, shippingMethodConfig.title, adjustedRate);
  });
}

/**
 * Process Surepost shipping method and add to shipping methods
 * @param {Array} shippingMethods - Array to add methods to
 * @param {object} params - Parameters
 * @param {string} accessToken - UPS access token
 * @param {object} logger - Logger instance
 */
async function processSurepostShipping(shippingMethods, params, accessToken, logger) {
  try {
    const surepostRate = await getSurepostShippingMethod(params, accessToken, logger);

    if (surepostRate) {
      const destCountryId = params.rateRequest?.dest_country_id;
      const baseRate = parseFloat(surepostRate);
      const adjustedRate = Number(calculateAdjustedRate(baseRate, params, destCountryId).toFixed(2));

      const surepostConfig = SUREPOST_SHIPPING_METHODS[92];
      addShippingMethod(shippingMethods, params, surepostConfig.code, surepostConfig.title, adjustedRate);

      logger.info(`Surepost rate processed: ${adjustedRate}`);
    }
  } catch (error) {
    logger.error('Error processing Surepost shipping:', error);
  }
}

/**
 * Generate cache key for UPS rates
 * @param {object} rateRequest - Rate request parameters
 * @returns {string} - Cache key
 */
function generateCacheKey(rateRequest) {
  const {
    dest_country_id: destCountryId,
    dest_postcode: destPostcode,
    dest_region_id: destRegionId,
    package_weight: packageWeight,
  } = rateRequest;
  return String(destCountryId + destPostcode + destRegionId + packageWeight + UPS_CACHE_SALT);
}

/**
 * Get Carrier Shipping Method
 * @param {object} params - params
 * @param {object} logger - logger
 * @returns {Array} - return Carrier shipping methods
 */
async function getUpsShippingMethod(params, logger) {
  logger.info('Calling the UPS shipping method');
  const shippingMethods = [];

  // Check for missing request input parameters
  const requiredParams = [
    'rateRequest.dest_country_id',
    'rateRequest.dest_postcode',
    'rateRequest.dest_region_id',
    'rateRequest.package_weight',
  ];
  const errorMessage = checkMissingRequestInputs(params, requiredParams);
  if (errorMessage) {
    logger.error(errorMessage);
    return shippingMethods;
  }

  try {
    const state = await stateLib.init();
    const cacheKey = generateCacheKey(params.rateRequest);

    // Check cache first
    const cacheRates = await state.get(cacheKey);
    if (cacheRates?.value !== null && cacheRates?.value !== undefined) {
      logger.info('ups rates found from cache');
      return JSON.parse(cacheRates.value);
    }

    // Get UPS rates
    const requestBody = await getUpsPayload(params, logger);
    const upsClient = await getAccessToken(params);
    const response = await got.post(params.UPS_RATE_ENDPOINT, {
      json: requestBody,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${upsClient.access_token}`,
      },
      responseType: 'json',
    });

    if (response.body.RateResponse.Response.ResponseStatus.Code !== '1') {
      logger.warn('UPS API returned unsuccessful response');
      return shippingMethods;
    }

    // Process Surepost shipping
    await processSurepostShipping(shippingMethods, params, upsClient.access_token, logger);

    // Process UPS rated shipments
    const ratedShipments = response.body.RateResponse.RatedShipment;
    processUpsRatedShipments(ratedShipments, shippingMethods, params, logger);

    // Cache the results
    await state.put(cacheKey, JSON.stringify(shippingMethods), { ttl: CACHE_TTL_SECONDS });

    logger.info(`Retrieved ${shippingMethods.length} UPS shipping methods`);
  } catch (error) {
    logger.error('Error fetching UPS rates dd:', JSON.stringify(error));
  }

  return shippingMethods;
}

/**
 * Get UPS Payload
 *
 * @param {object} params - params
 * @param {object} logger - logger
 * @returns {Array} - return Carrier shipping methods
 */
async function getUpsPayload(params, logger) {
  const regionCode =
    params.rateRequest?.dest_region_code ||
    (
      await getStateCode(
        params.rateRequest?.dest_country_id,
        params.rateRequest?.dest_region_id,
        params.COMMERCE_WEBACTION_GRAPH_QL_URL,
        logger
      )
    ).body.regionCode;

  return {
    RateRequest: {
      Request: {
        TransactionReference: {
          CustomerContext: 'Rating and Service',
        },
      },
      Shipment: {
        Shipper: {
          Name: params.UPS_NAME,
          ShipperNumber: '',
          Address: {
            AddressLine: ['01'],
            City: '',
            StateProvinceCode: params.UPS_STATE_CODE,
            PostalCode: params.UPS_POSTAL_CODE,
            CountryCode: params.UPS_COUNTRY_CODE,
          },
        },
        ShipTo: {
          Address: {
            AddressLine: ['01'],
            StateProvinceCode: regionCode,
            PostalCode: params.rateRequest.dest_postcode,
            CountryCode: params.rateRequest.dest_country_id,
            ResidentialAddressIndicator: '01',
          },
        },
        ShipFrom: {
          Address: {
            AddressLine: [],
            StateProvinceCode: params.UPS_STATE_CODE,
            PostalCode: params.UPS_POSTAL_CODE,
            CountryCode: params.UPS_COUNTRY_CODE,
          },
        },
        Package: [
          {
            PackagingType: {
              Code: '00',
              Description: 'Packaging',
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: params.UPS_DIMENSIONS_UNIT_OF_MEASUREMENT_CODE,
                Description: params.UPS_DIMENSIONS_UNIT_OF_MEASUREMENT_DESCRIPTION,
              },
              Length: '0',
              Width: '0',
              Height: '0',
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: params.UPS_PACKAGE_UNIT_OF_MEASUREMENT,
              },
              Weight: String(params.rateRequest?.package_weight),
            },
          },
        ],
      },
    },
  };
}

module.exports = {
  getUpsShippingMethod,
};
