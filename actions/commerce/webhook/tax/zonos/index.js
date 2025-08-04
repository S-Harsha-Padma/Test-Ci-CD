const got = require('got');
const { getHtsCodesFromCommerce } = require('../../../aio-state');
const {
  thresholdParseZonosResponse,
  MAGENTO_TAX_INTERFACE,
  MAGENTO_TAX_BREAKDOWN_INTERFACE,
} = require('./threshholdZonosTax');

/**
 * Zonos tax api request
 *
 * @param {object} params the request parameters
 * @param {object} quoteDetails the quoteDetails parameter
 * @param {object} logger the logger
 * @returns {string} the response
 */
async function getZonosResponse(params, quoteDetails, logger) {
  try {
    let shippingDetails = null;

    const productSku = quoteDetails?.items.filter((item) => item.type !== 'shipping').map((item) => item?.sku || []);
    const htsCodeMap = await getHtsCodesFromCommerce(productSku, params, logger);
    let serviceLevel = quoteDetails?.shipping?.shipping_method;
    const zonosShippingPrefixes = params.ZONOS_SHIPPING_METHODS?.split(',') || [];

    for (const prefix of zonosShippingPrefixes) {
      const prefixWithUnderscore = `${prefix}_`;
      if (serviceLevel.startsWith(prefixWithUnderscore)) {
        serviceLevel = serviceLevel.substring(prefixWithUnderscore.length);
        break;
      }
    }

    const items = quoteDetails.items
      .filter((item) => {
        if (item.type === 'shipping') {
          shippingDetails = {
            amount: item?.unit_price,
            amount_discount: item?.discount_amount ?? 0,
            service_level: serviceLevel || '',
          };
          return false;
        }
        return true;
      })
      .map((item) => ({
        id: item?.code,
        amount: item?.unit_price ?? 0,
        amount_discount: item?.discount_amount ?? 0,
        hs_code: htsCodeMap[item.sku] || '',
        quantity: item?.quantity,
        duty_tax_fee_free: item?.sku === 'gift-card' ? 'exclude' : null,
      }));

    const requestBody = {
      currency: 'USD',
      items,
      landed_cost: 'delivery_duty_paid',
      sale_type: 'not_for_resale',
      ship_from_country: 'US',
      ship_to: {
        city: quoteDetails.ship_to_address.city,
        country: quoteDetails.ship_to_address.country,
        postal_code: quoteDetails.ship_to_address.postcode,
        state: quoteDetails.ship_to_address?.region_code
          ? quoteDetails.ship_to_address.region_code
          : quoteDetails.ship_to_address.region,
      },
      shipping: shippingDetails,
      tariff_rate: 'zonos_preferred',
    };
    logger.debug('Zonos api request:', requestBody);
    const response = await got.post(params.ZONOS_API_URL, {
      json: requestBody,
      headers: {
        serviceToken: params.ZONOS_API_KEY,
        'zonos-version': '2019-11-21',
        'Content-Type': 'application/json',
      },
      responseType: 'json',
    });
    logger.debug('Zonos api response:', response.body);

    return parseZonosResponse(response.body, quoteDetails);
  } catch (error) {
    logger.debug('Zonos api error:', error);
    logger.debug('Zonos error status code:', error.statusCode);
    const errorBody = error.response?.body;
    const statusCode = error.response?.statusCode;
    const errorMessage = typeof errorBody === 'object' ? errorBody?.messages : errorBody;
    if (
      !error.response?.statusCode ||
      error.response?.statusCode === 'undefined' ||
      statusCode === 403 ||
      errorMessage === 'You are not authorized to access this resource.'
    ) {
      // Return the threshold tax response
      return thresholdParseZonosResponse(quoteDetails);
    }
    throw new Error(`${errorMessage}`);
  }
}

/**
 * Create zonos response for tax webhook
 *
 * @param {object} response the zonos tax api response
 * @param {object} quoteDetails the quoteDetails parameter
 * @returns {string} the response
 */
const parseZonosResponse = (response, quoteDetails) => {
  const operations = [];

  const zonosTaxes = response.amount_subtotal?.taxes || 0;
  const zonosDuties = response.amount_subtotal?.duties || 0;
  const zonosFees = response.amount_subtotal?.fees || 0;
  let subTotal = 0;

  quoteDetails.items.forEach((item) => {
    subTotal += item.unit_price * item.quantity;
  });

  quoteDetails.items.forEach((item, itemIndex) => {
    if (item.type === 'shipping') {
      // Calculate the overall tax, including shipping, since item-level tax details are not available.
      const taxAmount = zonosTaxes + zonosDuties + zonosFees;

      // Commerce requires a tax_rate for displaying the tax line on EDS. Since the exact tax percentage
      // is not available due to currency conversion fees and other factors, we calculate
      // the tax rate based on the subtotal for tax and tax breakdown. Note that this
      // percentage is an approximation and does not represent the exact tax rate for
      // shipping or individual items.
      const taxRate = (taxAmount / subTotal) * 100;

      // Replace item tax
      operations.push({
        op: 'replace',
        path: `oopQuote/items/${itemIndex}/tax`,
        value: {
          data: {
            amount: taxAmount,
            rate: taxRate,
          },
        },
        instance: MAGENTO_TAX_INTERFACE,
      });
      // Tax subtotal breakdown
      Object.entries(response?.amount_subtotal || {}).forEach(([key, value], index) => {
        const feeTitle = key.replace(/^./, (char) => char.toUpperCase());
        operations.push({
          op: 'add',
          path: `oopQuote/items/${itemIndex}/tax_breakdown`,
          value: {
            data: {
              code: key,
              rate: (value / subTotal) * 100,
              amount: value,
              title: feeTitle,
            },
          },
          instance: MAGENTO_TAX_BREAKDOWN_INTERFACE,
        });
      });
    }
  });
  return operations;
};

module.exports = { getZonosResponse };
