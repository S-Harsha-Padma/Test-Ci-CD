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

const { getName } = require('country-list');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { errorResponse } = require('../../../../utils');
const { HTTP_OK, HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR } = require('../../../../../lib/http');
const { isErpOrderCreated } = require('../../../../../lib/adobe-commerce');
const { getRegionCodeByName } = require('../../../../../lib/region-codes');
const { getOrderGiftMessage, getCustomerGroupById } = require('../../../../../lib/aio-state');
const FREE_SHIPPING_METHOD = 'E-M';
const NOT_LOGGED_IN_CUSTOMER_GROUP = 'NOT LOGGED IN';
const GIFT_CARD_PRODUCT_PREFIX = 'ADOBGC$-PURCH';
const shippingMethods = [
  {
    shippingMethod: [
      { method: 'UPS', label: 'UPS Ground', code: 'UPS_ups_ground' },
      { method: '3DY', label: 'UPS 3-Day Select', code: 'UPS_ups_3_day_select' },
      { method: 'UBL', label: 'UPS 2nd Day Air', code: 'UPS_ups_2nd_day_air' },
      { method: 'URD', label: 'UPS Next Day Air', code: 'UPS_ups_next_day_air' },
      { method: 'UPX', label: 'UPS INTL Express 1-2 days', code: 'UPS_ups_express' },
      { method: 'UXP', label: 'UPS INTL Expedited 3-4 day', code: 'UPS_ups_expedited' },
      { method: 'UCM', label: 'UPS Worldwide Saver', code: 'UPS_ups_express_saver' },
      { method: 'UCM', label: 'UPS INTL GRD Canada/Mexico', code: 'NA' },
      { method: 'FE3', label: 'FedEx INTL 3-5 DAY', code: 'FEDEX_fedex_international_priority' },
      { method: 'FI3', label: 'FEDEX Priority 1-3 DAY', code: 'FEDEX_fedex_international_priority_express' },
      { method: 'COU', label: 'Courier', code: 'COURIER_courier_shipping' },
      { method: 'PIC', label: 'Warehouse Pickup ', code: 'WAREHOUSE_PICKUP_warehouse-pickup' },
      { method: 'F3G', label: 'FedEx Ground', code: 'FEDEX_fedEx-f3g-ground' },
      { method: 'FP3', label: 'FP3-Standard Overnight', code: 'FEDEX_fedEx-fp3-standard-overnight' },
      { method: 'F3D', label: 'Priority Overnight', code: 'FEDEX_fedEx-f3d-priority-overnight' },
      { method: 'FX3', label: 'FX3-Express Saver 3 Day', code: 'FEDEX_fedEx-fx3-express-saver-3-day' },
      { method: 'F23', label: 'F23-Express Saver 2 Day', code: 'FEDEX_fedEx-f23-express-saver-2-day' },
      { method: 'PM', label: 'United States Postal Service', code: 'tablerate_bestway' },
      { method: 'E-M', label: 'Free Shipping', code: FREE_SHIPPING_METHOD },
      { method: 'USP', label: 'UPS Ground Saver', code: 'UPS_ups_ground_saver' },
    ],
  },
  {
    paymentMethod: [
      { method: 'GC', label: 'Gift Cards', code: 'free' }, // Gift Cards
      { method: 'CC', label: 'Authorize.Net', code: 'authorizenet' }, // Credit Card
      { method: 'PO', label: 'Purchase Order', code: 'purchaseorder' }, // Purchase Order
      { method: 'CHK', label: 'Check / Money order', code: 'checkmo' }, // Check / Money order
      { method: 'COD', label: 'Cash on Delivery', code: 'cashondelivery' }, // Cash on Delivery
    ],
  },
];

/**
 * Process bundle products and their associated simple products
 *
 * @param {Array} items - Array of order items
 * @returns {Array} - Processed items with bundle information
 */
function processBundleProducts(items) {
  const processedItems = [];
  const bundleItems = items.filter((item) => item.product_type === 'bundle');

  bundleItems.forEach((bundleItem) => {
    const bundleProductItemId = bundleItem.item_id;
    const associatedItems = items.filter(
      (item) => item.product_type === 'simple' && item.parent_item_id === bundleProductItemId
    );

    // Calculate total quantity of associated items
    const totalAssociatedQty = associatedItems.reduce((sum, item) => sum + parseInt(item.qty_ordered), 0);

    // Create a new item with bundle information
    const processedItem = {
      ...bundleItem,
      bundle_items: associatedItems,
      total_bundle_qty: totalAssociatedQty,
      bundle_ratio: totalAssociatedQty / parseInt(bundleItem.qty_ordered),
    };

    processedItems.push(processedItem);
  });

  // Add non-bundle items
  const nonBundleItems = items.filter((item) => item.product_type !== 'bundle');
  processedItems.push(...nonBundleItems);

  return processedItems;
}

/**
 * Returning CrmXml payload
 *
 * @param {object} params - Prettier params
 * @param {object} process - Process object
 * @param {object} logger - Logger object
 * @returns {string} - The CrmXml payload as a string
 */
async function generateCrmXmlPayload(params, process, logger) {
  // params.data is an object with a value property
  const { value } = params.data;
  const {
    created_at: createdAt,
    increment_id: incrementId,
    store_currency_code: storeCurrencyCode,
    base_grand_total: baseGrandTotal,
    shipping_description: shippingDescription,
    items,
    addresses,
    billing_address_id: billingAddressId,
    shipping_address_id: shippingAddressId,
    discount_amount: discountAmount,
    discount_description: discountDescription,
    coupon_code: couponCode,
    shipping_method: shippingMethod = FREE_SHIPPING_METHOD,
    gw_id: gwId,
    gw_price_incl_tax: gwPriceInclTax,
    gift_message_id: giftMessageId,
    payment: paymentObject,
    customer_group_id: customerGroupId,
    shipping_amount: shippingAmountExclTax,
    gift_cards: giftCards,
  } = value.order;
  const shippingAddress = addresses.find((addr) => addr.address_type === 'shipping');
  // Check if shipping address exists and has correct type
  if (!shippingAddress) {
    // Find the billing address
    const billingAddress = addresses.find((addr) => addr.address_type === 'billing');
    if (billingAddress) {
      const newShippingAddress = { ...billingAddress, address_type: 'shipping' };
      const filteredAddresses = addresses.filter(
        (addr) => addr.address_type !== 'shipping' && addr.address_type !== 'billing'
      );
      addresses.length = 0; // Clear the array
      addresses.push(newShippingAddress, billingAddress, ...filteredAddresses);

      logger.debug(`addresses (added shipping from billing): ${JSON.stringify(addresses)}`);
    } else {
      logger.error('No billing address found to create shipping address.');
    }
  }

  switch (shippingMethod) {
    case 'WAREHOUSE_PICKUP_warehouse-pickup':
      // Update and add static shipping address for warehouse pickup
      if (addresses[0]) {
        addresses[0].street = '1943 Lundy Ave';
        addresses[0].city = 'San Jose';
        addresses[0].region = 'California';
        addresses[0].postcode = '95131';
        addresses[0].country_id = 'US';
      }
      break;
    case 'COURIER_courier_shipping':
      // Update and add static shipping address for courier shipping
      if (addresses[0]) {
        addresses[0].street = '345 Park Ave';
        addresses[0].city = 'San Jose';
        addresses[0].region = 'California';
        addresses[0].postcode = '95110';
        addresses[0].country_id = 'US';
      }
      break;
    default:
      break;
  }

  // Customer Group ID
  let customerGroup = await getCustomerGroupById(params, logger, customerGroupId);
  customerGroup = customerGroup === NOT_LOGGED_IN_CUSTOMER_GROUP ? 'NON_LOGGED_USER' : customerGroup;
  logger.debug(`customerGroup: ${JSON.stringify(customerGroup)}`);

  // Process bundle products
  const processedItems = processBundleProducts(items);

  const orderDateFormat = createdAt.replace(/\s+/g, '');
  const formattedOrderId = `${incrementId}_${params.ORDER_ID_PREFIX}`;
  const uniquePayloadId = `${encodeBase64(orderDateFormat)}_@${formattedOrderId}`;

  const isFedExShippingFlag = isFedExShipping(shippingMethod ?? FREE_SHIPPING_METHOD);
  console.log(`isFedExShippingFlag: ${isFedExShippingFlag}`);
  const buildAddress = (address, type) => ({
    Address: {
      '@_addressID': type === 'billing' ? billingAddressId : shippingAddressId,
      '@_isoCountryCode': address?.country_id,
      Name: { '@_xml:lang': 'en', '#text': `${address?.firstname} ${address?.lastname}` },
      PostalAddress: {
        '@_name': 'default',
        DeliverTo: `${address?.firstname} ${address?.lastname}`,
        Street: address?.street?.replace(/\n/g, ' ').trim(),
        City: address?.city,
        State: getRegionCodeByName(address?.region),
        PostalCode: address?.postcode,
        Country: { '@_isoCountryCode': address?.country_id, '#text': getName(address?.country_id) },
      },
      Email: { '@_name': 'default', '@_preferredLang': 'en-US', '#text': address?.email },
      Phone: {
        '@_name': 'work',
        TelephoneNumber: {
          CountryCode: { '@_isoCountryCode': address?.country_id, '#text': getName(address?.country_id) },
          AreaOrCityCode: getAreaCode(address?.city),
          Number: address?.telephone,
        },
      },
    },
  });

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
    attributeNamePrefix: '@_',
  });

  let lineNumber = 1;
  let totalQty = 0;

  // Only count quantities for bundle products and their associated items
  const bundleItems = processedItems.filter((item) => item.product_type === 'bundle');

  bundleItems.forEach((bundleItem) => {
    totalQty += bundleItem.qty_ordered;
  });

  const filteredItems = processedItems
    .filter(
      (item, index, self) => item.product_type === 'giftcard' || index === self.findIndex((t) => t.sku === item.sku)
    )
    .filter((item, index, self) => {
      if (item.product_type === 'giftcard') {
        const itemSku = GIFT_CARD_PRODUCT_PREFIX.replace('$', item.price);
        return (
          index ===
          self.findIndex(
            (t) => t.product_type === 'giftcard' && GIFT_CARD_PRODUCT_PREFIX.replace('$', t.price) === itemSku
          )
        );
      }
      return true;
    })
    .map((item) => {
      return createLineItem(item, createdAt, storeCurrencyCode, lineNumber++, params.UNIT_OF_MEASURE, processedItems);
    });
  logger.debug('Total Quantity Ordered:', totalQty);
  const staticItem = [];

  // Add static items for FedEx shipping
  if (isFedExShippingFlag) {
    staticItem.push(
      createStaticItem(
        params.FEDEX_SHIPPING_PRODUCT_SKU,
        params.FEDEX_SHIPPING_PRODUCT_ID,
        params.FEDEX_SHIPPING_PRODUCT_NAME,
        params.FEDEX_SHIPPING_PRODUCT_PRICE,
        createdAt,
        storeCurrencyCode,
        lineNumber++,
        '[ADOB-BSHIPPING]Business order processing/handling',
        params.UNIT_OF_MEASURE
      )
    );
  }

  // Check if the shipping country is not US and add the international shipping product
  const shippingCountry = shippingAddress?.country_id;
  logger.debug(`shippingCountry: ${shippingCountry}`);
  if (shippingCountry && shippingCountry !== 'US') {
    if (!isFedExShippingFlag) {
      staticItem.push(
        createStaticItem(
          params.FEDEX_INTERNATIONAL_SHIPPING_PRODUCT_SKU,
          params.FEDEX_INTERNATIONAL_SHIPPING_PRODUCT_ID,
          params.FEDEX_INTERNATIONAL_SHIPPING_PRODUCT_NAME,
          shippingAmountExclTax,
          createdAt,
          storeCurrencyCode,
          lineNumber++,
          params.FEDEX_INTERNATIONAL_SHIPPING_PRODUCT_NAME,
          params.UNIT_OF_MEASURE
        )
      );
    }
  }

  // Add static items for GW inline product
  if (gwId && gwId > 0) {
    staticItem.push(
      createStaticItem(
        params.GW_INLINE_PRODUCT_SKU,
        params.GW_INLINE_PRODUCT_ID,
        params.GW_INLINE_PRODUCT_NAME,
        params.GW_INLINE_PRODUCT_PRICE,
        createdAt,
        storeCurrencyCode,
        lineNumber++,
        params.GW_INLINE_PRODUCT_NAME,
        params.UNIT_OF_MEASURE
      )
    );

    // Add static items for GW inline bundle product
    if (totalQty > 0) {
      staticItem.push(
        createStaticItem(
          params.GW_INLINE_BUNDLE_PRODUCT_SKU,
          params.GW_INLINE_BUNDLE_PRODUCT_ID,
          params.GW_INLINE_BUNDLE_PRODUCT_NAME,
          params.GW_INLINE_BUNDLE_PRODUCT_PRICE,
          createdAt,
          storeCurrencyCode,
          lineNumber++,
          params.GW_INLINE_BUNDLE_PRODUCT_NAME,
          params.UNIT_OF_MEASURE,
          totalQty
        )
      );
    }
  }
  // Add static items for GW inline gift note product
  let gwFrom = '';
  let gwTo = '';
  let gwMessage = '';
  if (giftMessageId && giftMessageId > 0) {
    // Get gift wrapping message details
    const orderGWmessage = await getOrderGiftMessage(params, logger);
    logger.debug('Gift message after parsing:', orderGWmessage);

    if (orderGWmessage.message) {
      gwFrom = orderGWmessage.from;
      gwTo = orderGWmessage.to;
      gwMessage = orderGWmessage.message;
      logger.info(`gwFrom: ${gwFrom}`);
      logger.info(`gwTo: ${gwTo}`);
      logger.info(`gwMessage: ${gwMessage}`);
      staticItem.push(
        createStaticItem(
          params.GW_INLINE_GIFT_NOTE_PRODUCT_SKU,
          params.GW_INLINE_GIFT_NOTE_PRODUCT_ID,
          params.GW_INLINE_GIFT_NOTE_PRODUCT_NAME,
          params.GW_INLINE_GIFT_NOTE_PRODUCT_PRICE,
          createdAt,
          storeCurrencyCode,
          lineNumber++,
          params.GW_INLINE_GIFT_NOTE_PRODUCT_NAME,
          params.UNIT_OF_MEASURE
        )
      );
    }
  }

  // Add static items for gift cards
  if (giftCards && giftCards.length > 0) {
    const giftCardsData = JSON.parse(giftCards);
    giftCardsData.forEach((card) => {
      staticItem.push(
        createStaticItem(
          params.GIFT_CARD_PRODUCT_SKU,
          'giftcardredeem',
          params.GIFT_CARD_PRODUCT_NAME,
          `-${card.a}`,
          createdAt,
          storeCurrencyCode,
          lineNumber++,
          card.c,
          params.UNIT_OF_MEASURE
        )
      );
    });
  }

  // Add static items for promo code line item
  if (couponCode) {
    staticItem.push(
      createStaticItem(
        params.PROMO_CODE_LINE_ITEM_SKU,
        'promocodeitem',
        params.PROMO_CODE_LINE_ITEM_NAME,
        discountAmount,
        createdAt,
        storeCurrencyCode,
        lineNumber++,
        discountDescription,
        params.UNIT_OF_MEASURE
      )
    );
  }

  const ItemOut = filteredItems.concat(staticItem);

  const requestObject = {
    cXML: {
      '@_payloadID': uniquePayloadId,
      '@_timestamp': createdAt,
      '@_version': '1.2.044',
      '@_xml:lang': 'en-US',
      Header: {
        From: {
          Credential: [
            { '@_domain': 'NetworkId', Identity: 'Adobe' },
            { '@_domain': 'SystemID', Identity: '1' },
          ],
        },
        To: {
          Credential: [
            { '@_domain': 'NetworkId', Identity: 'Halo' },
            { '@_domain': 'internalsupplierid', Identity: '0002043729' },
            { '@_domain': 'buyersystemid', Identity: 'acm_184040700' },
            { '@_domain': 'qa1', Identity: '0002044087' },
          ],
        },
        Sender: {
          Credential: {
            '@_domain': 'NetworkID',
            Identity: params.SENDER_IDENTITY,
            SharedSecret: params.SENDER_SHARED_SECRET,
          },
          UserAgent: params.SENDER_USER_AGENT,
        },
      },
      Request: {
        '@_deploymentMode': params.DEPLOYMENT_MODE,
        OrderRequest: {
          OrderRequestHeader: {
            '@_orderDate': createdAt,
            '@_orderID': formattedOrderId,
            '@_orderType': 'regular',
            '@_orderVersion': '1',
            '@_type': 'new',
            Total: { Money: { '@_currency': storeCurrencyCode, '#text': baseGrandTotal } },
            ShipTo: buildAddress(addresses[0], 'shipping'),
            BillTo: buildAddress(addresses[1], 'billing'),
            Shipping: {
              Money: { '@_currency': storeCurrencyCode, '#text': shippingAmountExclTax },
              Description: { '@_xml:lang': 'en-US', '#text': shippingDescription },
            },
            PaymentTerm: {
              '@_payInNumberOfDays': params.PAYMENT_TERM,
              Extrinsic: [
                { '@_name': 'discountAmount', '#text': Math.abs(discountAmount) },
                { '@_name': 'discountDescription', '#text': discountDescription },
                { '@_name': 'couponCode', '#text': couponCode },
                { '@_name': 'paymentMethodCode', '#text': getPaymentCode(paymentObject.method) ?? '' },
              ],
            },
            Extrinsic: [
              { '@_name': 'shippingMethodCode', '#text': getShippingCode(shippingMethod) ?? '' },
              { '@_name': 'costCenterValue', '#text': paymentObject?.additional_information?.ext_shipping_info ?? '' },
              { '@_name': 'gw_id', '#text': gwId ?? '' },
              { '@_name': 'gw_price', '#text': gwPriceInclTax ?? '' },
              { '@_name': 'gw_gift_message_available', '#text': giftMessageId ?? '' },
              { '@_name': 'gw_to', '#text': gwTo ?? '' },
              { '@_name': 'gw_from', '#text': gwFrom ?? '' },
              { '@_name': 'gw_message', '#text': gwMessage ?? '' },
              { '@_name': 'CustomerGroup', '#text': customerGroup ?? '' },
            ],
          },
          ItemOut,
        },
      },
    },
  };
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.044/cXML.dtd">\n${builder.build(requestObject)}`.trim();
}

/**
 * Convert Soap XML document ID to Base64
 *
 * @param {string} input - The input Soap XML document ID
 * @returns {string} - The Base64 encoded string
 */
function encodeBase64(input) {
  const inputAsString = input.toString();
  const buffer = Buffer.from(inputAsString, 'utf-8');
  return buffer.toString('base64');
}

/**
 * Sending SOAP Request
 *
 * @param {string} payload - The SOAP request payload
 * @param {string} soapEndpoint - The SOAP endpoint URL
 * @param {object} logger - The logger object for logging errors
 * @returns {Promise<string>} - A promise that resolves to the SOAP response as a string
 */
async function sendHaloErpSoapRequest(payload, soapEndpoint, logger) {
  try {
    const response = await fetch(soapEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: payload,
      responseType: 'text',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.text();
    return result;
  } catch (error) {
    console.error('Error sending request:', error);
    return errorResponse(HTTP_INTERNAL_ERROR, 'Error sending SOAP request', logger);
  }
}
/**
 * Response handling
 *
 * @param {string} responseText - The response text to handle
 * @param {object} logger - The logger object for logging errors
 * @param {object} params - The parameters object
 * @returns {{error: {statusCode: number, body: {error: string}}}|{statusCode: number, body: {success: boolean, message: string}}} - The formatted response object
 */
function handleResponse(responseText, logger, params) {
  let erpMessage = null;
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });
  const result = parser.parse(responseText);
  logger.debug(result);
  const statusCode = result.cXML?.Response?.Status.code;
  const status = result.cXML?.Response?.Status;
  if (!status) {
    logger.error('Invalid response format');
    return errorResponse(HTTP_INTERNAL_ERROR, 'Invalid response format', logger);
  }

  switch (statusCode) {
    case HTTP_OK:
      erpMessage = 'ERP Order was processed successfully.';
      // ERP Order Created successfully in the ERP system and the order history is updated in saas commerce
      isErpOrderCreated(params);
      break;
    case HTTP_BAD_REQUEST:
      erpMessage = result.cXML.Response.Status.text;
      break;
  }
  const successField = {
    payloadID: result.cXML.payloadID,
    message: erpMessage,
  };
  logger.debug('successField', successField);

  logger.info('ERP Order processed successfully.');
  return {
    statusCode: HTTP_OK,
    body: {
      success: true,
      successField,
    },
  };
}

/**
 * Get the area code from the city name
 *
 * @param {string} cityName - The city name
 * @returns {string} - The area code
 */
function getAreaCode(cityName) {
  return cityName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Check if the shipping method is FedEx
 *
 * @param {string} shippingMethod - The shipping method
 * @returns {boolean} - True if the shipping method is FedEx, false otherwise
 */
function isFedExShipping(shippingMethod) {
  return shippingMethod.toLowerCase().includes('fedex');
}

/**
 * Create a line item
 *
 * @param {object} item - The item object
 * @param {string} createdAt - The creation date
 * @param {string} storeCurrencyCode - The store currency code
 * @param {number} lineNumber - The line number
 * @param {string} unitOfMeasure - The unit of measure
 * @param {Array} processedItems - The processed items array
 * @returns {object} - The line item object
 */
function createLineItem(item, createdAt, storeCurrencyCode, lineNumber, unitOfMeasure, processedItems) {
  let itemSku = item.sku;
  if (item.product_type === 'giftcard') {
    itemSku = GIFT_CARD_PRODUCT_PREFIX.replace('$', item.price);
    const sameSkuItems = processedItems.filter(
      (otherItem) =>
        otherItem.product_type === 'giftcard' &&
        GIFT_CARD_PRODUCT_PREFIX.replace('$', otherItem.price) === itemSku &&
        otherItem !== item
    );

    if (sameSkuItems.length > 0) {
      item.qty_ordered = sameSkuItems.reduce((total, sameItem) => total + sameItem.qty_ordered, item.qty_ordered);
      sameSkuItems.forEach((sameItem) => {
        const index = processedItems.indexOf(sameItem);
        if (index > -1) {
          processedItems.splice(index, 1);
        }
      });
    }
  }

  return {
    '@_quantity': item.qty_ordered,
    '@_requestedDeliveryDate': createdAt,
    '@_lineNumber': lineNumber,
    ItemID: { SupplierPartID: itemSku, SupplierPartAuxiliaryID: item.product_id },
    ItemDetail: {
      UnitPrice: { Money: { '@_currency': storeCurrencyCode, '#text': item.base_price } },
      Description: { '@_xml:lang': 'en-US', ShortName: item.name, '#text': item.description ?? 'NA' },
      UnitOfMeasure: unitOfMeasure,
      Classification: { '@_domain': 'UNSPSC', '#text': '80141605' },
    },
  };
}

/**
 * Create a static item
 *
 * @param {string} sku - The SKU
 * @param {string} productId - The product ID
 * @param {string} name - Product Name
 * @param {string} price - The price
 * @param {string} createdAt - The creation date
 * @param {string} storeCurrencyCode - The store currency code
 * @param {number} lineNumber - The line number
 * @param {string} description - The description
 * @param {string} unitOfMeasure - The unit of measure
 * @param {number} totalQty - The total quantity
 * @returns {object} - The static item object
 */
function createStaticItem(
  sku,
  productId,
  name,
  price,
  createdAt,
  storeCurrencyCode,
  lineNumber,
  description,
  unitOfMeasure,
  totalQty = 1
) {
  return {
    '@_quantity': totalQty,
    '@_requestedDeliveryDate': createdAt,
    '@_lineNumber': lineNumber,
    ItemID: {
      SupplierPartID: sku,
      SupplierPartAuxiliaryID: productId,
    },
    ItemDetail: {
      UnitPrice: { Money: { '@_currency': storeCurrencyCode, '#text': price } },
      Description: {
        '@_xml:lang': 'en-US',
        ShortName: name,
        '#text': description,
      },
      UnitOfMeasure: unitOfMeasure,
      Classification: { '@_domain': 'UNSPSC', '#text': '80141605' },
    },
  };
}

/**
 * Get the method code
 *
 * @param {string} methodCode - The method code
 * @returns {string} - The method code
 */
function getShippingCode(methodCode) {
  const shippingList = shippingMethods[0].shippingMethod.find((obj) => obj.code === methodCode);
  return shippingList ? shippingList.method : null;
}

/**
 * Get the payment code
 *
 * @param {string} methodCode - The method code
 * @returns {string} - The method code
 */
function getPaymentCode(methodCode) {
  if (shippingMethods[1] && shippingMethods[1].paymentMethod) {
    const paymentList = shippingMethods[1].paymentMethod.find((obj) => obj.code === methodCode);
    return paymentList ? paymentList.method : null;
  }
  return null;
}

module.exports = {
  generateCrmXmlPayload,
  handleResponse,
  sendHaloErpSoapRequest,
};
