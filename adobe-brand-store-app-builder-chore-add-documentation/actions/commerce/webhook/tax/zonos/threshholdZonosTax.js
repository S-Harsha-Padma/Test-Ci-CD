const MAGENTO_TAX_INTERFACE = 'Magento\\OutOfProcessTaxManagement\\Api\\Data\\OopQuoteItemTaxInterface';
const MAGENTO_TAX_BREAKDOWN_INTERFACE =
  'Magento\\OutOfProcessTaxManagement\\Api\\Data\\OopQuoteItemTaxBreakdownInterface';

/**
 * Create thresholdParseZonosResponse zonos response for tax webhook
 *
 * @param {object} quoteDetails the quoteDetails parameter
 * @returns {string} the response
 */
const thresholdParseZonosResponse = (quoteDetails) => {
  const operations = [];
  let fixedTaxAmount = 0;
  let subTotal = 0;

  quoteDetails.items.forEach((item) => {
    console.log('item.unit_price * item.quantity', item.unit_price * item.quantity);
    subTotal += item.unit_price * item.quantity;
  });

  console.log('Subtotal:', subTotal);
  // Calculate 30% of the subtotal
  fixedTaxAmount = subTotal * 0.3;
  console.log('Fixed tax amount:', fixedTaxAmount);

  quoteDetails.items.forEach((item, itemIndex) => {
    if (item.type === 'shipping') {
      // Calculate the overall tax, including shipping, since item-level tax details are not available.
      const taxAmount = fixedTaxAmount;
      const taxRate = 30;
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

      operations.push({
        op: 'add',
        path: `oopQuote/items/${itemIndex}/tax_breakdown`,
        value: {
          data: {
            code: 'international-flat-fee',
            rate: taxRate,
            amount: taxAmount,
            title: 'International Flat 30% Tax Fee',
          },
        },
        instance: MAGENTO_TAX_BREAKDOWN_INTERFACE,
      });
    }
  });
  return operations;
};

module.exports = { thresholdParseZonosResponse, MAGENTO_TAX_INTERFACE, MAGENTO_TAX_BREAKDOWN_INTERFACE };
