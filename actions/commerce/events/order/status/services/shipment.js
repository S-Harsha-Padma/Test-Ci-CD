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

/**
 * @description Create Shipment for the order
 * @param {string} orderId order id
 * @param {object} response response from the order status
 * @param {object} client commerce client
 * @param {object} logger logger instance
 * @returns {boolean} returns bool
 */
async function createShipment(orderId, response, client, logger) {
  try {
    logger.info('Creating shipment order response from commerceClient Obj', response);

    // Validate response and tracking details
    if (!response || !response.tracking_details || !response.tracking_details[0]) {
      logger.error(`Invalid tracking details for order ${orderId}`);
      return false;
    }

    const carrierCode = response.tracking_details[0].carrier_code;
    const trackNumber = response.tracking_details[0].tracking_no;
    const trackingUrl = response.tracking_details[0].tracking_url;

    const requestBody = {
      notify: true,
      appendComment: true,
      comment: {
        comment: `Order Tracking Url : ${trackingUrl}`,
      },
      tracks: [
        {
          track_number: trackNumber,
          title: carrierCode,
          carrier_code: carrierCode,
        },
      ],
    };

    const createShipmentResponse = await client.shipmentOrder(orderId, requestBody);
    console.log('createShipmentResponse response from commerceClient Obj', createShipmentResponse);

    if (createShipmentResponse) {
      logger.info('Shipment created successfully for order', orderId);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error updating order status for ${orderId}:`, error.message);
    return false;
  }
}

module.exports = {
  createShipment,
};
