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

const { createShipment } = require('../../../../../../../actions/commerce/events/order/status/services/shipment');

describe('createShipment', () => {
  let logger;
  let client;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    client = {
      shipmentOrder: jest.fn(),
    };
  });

  test('should successfully create shipment', async () => {
    const orderId = '12345';
    const response = {
      tracking_details: [
        {
          carrier_code: 'UPS',
          tracking_no: '1Z999AA1234567890',
          tracking_url: 'https://www.ups.com/track?tracknum=1Z999AA1234567890',
        },
      ],
    };

    client.shipmentOrder.mockResolvedValue({
      status: 'success',
      message: 'Shipment created successfully',
    });

    const result = await createShipment(orderId, response, client, logger);

    // Assertions
    expect(result).toBe(true);
    expect(client.shipmentOrder).toHaveBeenCalledWith(orderId, {
      notify: true,
      appendComment: true,
      comment: {
        comment: `Order Tracking Url : ${response.tracking_details[0].tracking_url}`,
      },
      tracks: [
        {
          track_number: response.tracking_details[0].tracking_no,
          title: response.tracking_details[0].carrier_code,
          carrier_code: response.tracking_details[0].carrier_code,
        },
      ],
    });
    expect(logger.info).toHaveBeenCalledWith('Creating shipment order response from commerceClient Obj', response);
    expect(logger.info).toHaveBeenCalledWith('Shipment created successfully for order', orderId);
  });

  test('should handle error during shipment creation', async () => {
    const orderId = '12345';
    const response = {
      tracking_details: [
        {
          carrier_code: 'UPS',
          tracking_no: '1Z999AA1234567890',
          tracking_url: 'https://www.ups.com/track?tracknum=1Z999AA1234567890',
        },
      ],
    };

    // Mock error response
    client.shipmentOrder.mockRejectedValue(new Error('Failed to create shipment'));

    // Execute the function
    const result = await createShipment(orderId, response, client, logger);

    // Assertions
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      `Error updating order status for ${orderId}:`,
      'Failed to create shipment'
    );
  });

  test('should handle missing tracking details', async () => {
    // Setup test data with missing tracking details
    const orderId = '12345';
    const response = {
      tracking_details: [],
    };

    // Execute the function
    const result = await createShipment(orderId, response, client, logger);

    // Assertions
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(`Invalid tracking details for order ${orderId}`);
    expect(client.shipmentOrder).not.toHaveBeenCalled();
  });

  test('should handle invalid response format', async () => {
    // Setup test data with invalid format
    const orderId = '12345';
    const response = null;

    // Execute the function
    const result = await createShipment(orderId, response, client, logger);

    // Assertions
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(`Invalid tracking details for order ${orderId}`);
    expect(client.shipmentOrder).not.toHaveBeenCalled();
  });
});
