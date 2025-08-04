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
const { getStateCode } = require('../../../../aio-state');
const fetch = require('node-fetch');

/**
 * Get Surepost Shipping Method
 *
 * @param {object} params - params
 * @param {object} accessToken - accessToken
 * @param {object} logger - logger
 * @returns {object} - return Surepost shipping method
 */
async function getSurepostShippingMethod(params, accessToken, logger) {
  logger.info('Calling the Surepost shipping method');
  const requestBody = await getSurepostPayload(params, logger);
  console.log('requestBodySurepost==>', JSON.stringify(requestBody));
  // where is request body
  const response = await fetch(params.SP_UPS_RATE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });
  const responseBody = await response.json();
  console.log('responseBody', JSON.stringify(responseBody));

  const ratedShipment = responseBody?.RateResponse?.RatedShipment;
  if (ratedShipment.TotalCharges && typeof ratedShipment.TotalCharges.MonetaryValue !== 'undefined') {
    logger.info('Surepost service code 92 found in RatedShipment');
    // Parse and check the Surepost response for all required checks
    return ratedShipment.TotalCharges.MonetaryValue;
  }
}

/**
 * Get Surepost Payload
 *
 * @param {object} params - params
 * @param {object} logger - logger
 * @returns {object} - return Surepost payload
 */
async function getSurepostPayload(params, logger) {
  const regionCode =
    params.rateRequest?.dest_region_code ||
    (
      await getStateCode(
        params.rateRequest?.dest_country_id,
        params.rateRequest?.dest_region_id,
        params.COMMERCE_GRAPHQL_BASE_URL,
        logger
      )
    ).body.regionCode;

  return {
    RateRequest: {
      Request: {
        TransactionReference: {
          CustomerContext: 'CustomerContext',
        },
        RequestAction: 'Rate',
        RequestOption: 'Rate',
      },
      Shipment: {
        Shipper: {
          Name: params.SP_UPS_NAME,
          ShipperNumber: '617202',
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
            City: params.rateRequest.dest_city,
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
        Service: {
          Code: '92',
          Description: 'SurePost',
        },
        Package: [
          {
            PackagingType: {
              Code: '02',
              Description: 'Nails',
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: 'IN',
                Description: 'Inches',
              },
              Length: '10',
              Width: '30',
              Height: '45',
            },
            PackageWeight: {
              Weight: '1',
              UnitOfMeasurement: {
                Code: 'OZS',
                Description: 'Pounds',
              },
            },
          },
        ],
      },
    },
  };
}
module.exports = {
  getSurepostShippingMethod,
};
