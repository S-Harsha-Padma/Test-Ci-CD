module.exports = {
  resolvers: {
    SimpleProductView: {
      qty: {
        selectionSet: '{ sku }',
        resolve: (root, args, context, info) => {
          return context.productStock.Query.productStock({
            root,
            args: { sku: `${root.sku}` },
            context,
            info,
          }).then((response) => {
            return parseInt(response.qty);
          });
        },
      },
    },
  },
};
