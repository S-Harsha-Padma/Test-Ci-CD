const { XMLBuilder, XMLParser } = require('fast-xml-parser');

/**
 * Generate vertex soap request
 *
 * @param {object} params the request parameters
 * @param {object} quoteDetails the request parameters
 * @returns {string} the response
 */
async function generateVertexSoapRequest(params, quoteDetails) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
    attributeNamePrefix: '@_',
  });
  const vertexTaxClassMapping = JSON.parse(params.VERTEX_TAX_CLASS_MAPPING);

  const requestObject = {
    'SOAP-ENV:Envelope': {
      '@_xmlns:SOAP-ENV': 'http://schemas.xmlsoap.org/soap/envelope/',
      '@_xmlns:ns1': 'urn:vertexinc:o-series:tps:9:0',
      'SOAP-ENV:Body': {
        'ns1:VertexEnvelope': {
          'ns1:Login': {
            'ns1:TrustedId': params.VERTEX_TRUST_ID,
          },
          'ns1:QuotationRequest': {
            '@_documentDate': new Date().toISOString().split('T')[0],
            '@_transactionType': 'SALE',
            'ns1:Seller': {
              'ns1:Company': params.SELLER_COMPANY,
              'ns1:PhysicalOrigin': {
                'ns1:StreetAddress1': params.SELLER_STREET,
                'ns1:City': params.SELLER_CITY,
                'ns1:MainDivision': params.SELLER_DIVISION,
                'ns1:PostalCode': params.SELLER_POSTAL_CODE,
                'ns1:Country': params.SELLER_COUNTRY,
              },
            },
            'ns1:Customer': {
              'ns1:Destination': {
                'ns1:StreetAddress1': quoteDetails.ship_to_address?.street,
                'ns1:City': quoteDetails.ship_to_address?.city,
                'ns1:MainDivision': quoteDetails.ship_to_address?.region_code || quoteDetails.ship_to_address?.region,
                'ns1:PostalCode': quoteDetails.ship_to_address?.postcode,
                'ns1:Country': quoteDetails.ship_to_address?.country,
              },
            },
            'ns1:LineItem': quoteDetails.items.map((item, index) => {
              const mappedTaxCode = vertexTaxClassMapping.find((entry) => entry.type === item.tax_class)?.code || '000';

              return {
                '@_lineItemId': `${index}`,
                'ns1:Product': {
                  '#text': mappedTaxCode,
                },
                'ns1:Quantity': item.quantity,
                'ns1:UnitPrice': item.unit_price,
                'ns1:ExtendedPrice': item.unit_price * item.quantity,
              };
            }),
          },
        },
      },
    },
  };

  return builder.build(requestObject);
}

/**
 * Parse the soap response
 *
 * @param {object} responseXml the request parameters
 * @returns {string} the response
 */
async function parseVertexResponse(responseXml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
  });

  const parsedResponse = parser.parse(responseXml);
  const operations = [];

  const lineItems = parsedResponse['soapenv:Envelope']['soapenv:Body'].VertexEnvelope.QuotationResponse.LineItem;

  if (Array.isArray(lineItems) && lineItems.length > 0) {
    lineItems.forEach((item) => {
      const lineItemId = item['@_lineItemId'];
      const unitPrice = parseFloat(item.UnitPrice);
      const totalTax = parseFloat(item.TotalTax);
      const quantity = parseFloat(item.Quantity);
      const taxRate = (totalTax / quantity / unitPrice) * 100;

      operations.push({
        op: 'replace',
        path: `oopQuote/items/${lineItemId}/tax`,
        value: {
          data: {
            rate: Number(taxRate.toFixed(2)) || 0,
            amount: totalTax,
          },
        },
        instance: 'Magento\\OutOfProcessTaxManagement\\Api\\Data\\OopQuoteItemTaxInterface',
      });

      // Track tax_rate_keys already added
      const addedKeys = new Set();

      // Process each Taxes entry
      const taxes = Array.isArray(item?.Taxes) ? item?.Taxes : [item?.Taxes];
      taxes.forEach((tax) => {
        const taxAmount = parseFloat(tax.CalculatedTax);
        const taxRate = parseFloat(tax.EffectiveRate);
        const taxCode = tax?.Jurisdiction['@_jurisdictionLevel'];
        const taxJurisdictionId = tax?.Jurisdiction['@_jurisdictionId'];
        const taxRateKey = `${taxCode}-${taxJurisdictionId}`;
        if (!addedKeys.has(taxRateKey)) {
          addedKeys.add(taxRateKey);

          operations.push({
            op: 'add',
            path: `oopQuote/items/${lineItemId}/tax_breakdown`,
            value: {
              data: {
                code: taxCode,
                rate: taxRate * 100,
                amount: taxAmount,
                title: taxRateKey,
                tax_rate_key: taxRateKey,
              },
            },
            instance: 'Magento\\OutOfProcessTaxManagement\\Api\\Data\\OopQuoteItemTaxBreakdownInterface',
          });
        }
      });
    });
  }

  return operations;
}

/**
 * Parse error response
 *
 * @param {object} responseXml the request parameters
 * @returns {string} the response
 */
async function parseVertexErrorResponse(responseXml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
  });

  const parsed = parser.parse(responseXml);
  const fault = parsed?.['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault'];
  const exception = fault?.detail?.['ns2:VertexException'];
  let rootCause = exception?.rootCause;
  if (exception?.exceptionType === 'VertexInvalidAddressException') {
    rootCause =
      'The shipping address you provided is invalid. Please correct the address on the checkout page, return to this page and try again.';
  }

  return rootCause;
}

module.exports = {
  generateVertexSoapRequest,
  parseVertexResponse,
  parseVertexErrorResponse,
};
