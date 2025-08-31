# Stock Resolvers

## Overview

This document covers the stock resolvers that extend the GraphQL schema to provide real-time product stock information. These resolvers integrate with Adobe Commerce to fetch live inventory data and make it available through the GraphQL API.

## Resolver Files

### `stock-resolvers.js` - Product Stock Resolver

**Purpose**: Extends the GraphQL schema to add real-time stock quantity information to product views.

**Key Features**:
- **Schema Extension**: Adds `qty` field to `SimpleProductView` type
- **Real-time Data**: Fetches live stock information from Adobe Commerce
- **SKU-based Resolution**: Uses product SKU to retrieve stock quantities
- **Type Conversion**: Converts stock quantity to integer format

**Implementation**:
```javascript
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
```

**Key Components**:
- **Selection Set**: `{ sku }` - Ensures SKU is available for resolution
- **Context Integration**: Uses `context.productStock` to access the product stock service
- **Data Transformation**: Converts response quantity to integer using `parseInt()`

## GraphQL Schema Integration

### Schema Extension

The resolver extends the GraphQL schema by adding a `qty` field to the `SimpleProductView` type:

```graphql
extend type SimpleProductView { 
  qty: ID 
}
```

### API Mesh Configuration

The resolver is configured in the API Mesh through the `mesh.json` file:

```json
{
  "additionalTypeDefs": "extend type SimpleProductView { qty: ID }",
  "additionalResolvers": ["./resolvers/stock-resolvers.js"]
}
```

## Backend Service Integration

### Product Stock Service

The resolver integrates with the `productStock` service defined in the API Mesh:

**Service Configuration**:
```json
{
  "name": "productStock",
  "handler": {
    "JsonSchema": {
      "baseUrl": "https://3582053-903greenboaboa-stage.adobeioruntime.net/api/v1/web/product",
      "operations": [
        {
          "type": "Query",
          "field": "productStock",
          "path": "/stock?sku={args.sku}&product_type={args.product_type}&child_sku={args.child_sku}",
          "method": "GET",
          "argTypeMap": {
            "sku": { "type": "string" },
            "product_type": { "type": "string" },
            "child_sku": { 
              "type": "array",
              "items": { "type": "string" }
            }
          }
        }
      ]
    }
  }
}
```

### Adobe Commerce Integration

The resolver calls the Adobe Commerce product stock action (`actions/commerce/product/stock/index.js`) which:

1. **Simple Products**: Fetches salable quantity using `getProductSalableQuantity()`
2. **Bundle Products**: Calculates minimum available quantity across child products
3. **Error Handling**: Returns 0 for unavailable products or errors

**Response Format**:
```json
{
  "qty": 42
}
```

## Usage Examples

### GraphQL Query

```graphql
query GetProductWithStock($sku: String!) {
  products(filter: { sku: { eq: $sku } }) {
    items {
      sku
      name
      qty  # This field is resolved by the stock resolver
    }
  }
}
```

### Query Variables

```json
{
  "sku": "PRODUCT-SKU-123"
}
```

### Response

```json
{
  "data": {
    "products": {
      "items": [
        {
          "sku": "PRODUCT-SKU-123",
          "name": "Sample Product",
          "qty": "42"
        }
      ]
    }
  }
}
```

## Common Patterns and Best Practices

### 1. **Resolver Design**
- **Selection Set**: Always specify required fields in selection set
- **Error Handling**: Handle API failures gracefully
- **Type Conversion**: Ensure proper data type conversion
- **Performance**: Consider caching for frequently accessed data

### 2. **Context Integration**
- **Service Access**: Use context to access backend services
- **Authentication**: Ensure proper authentication headers are passed
- **Error Propagation**: Propagate errors from backend services

### 3. **Data Transformation**
- **Type Safety**: Convert data to appropriate GraphQL types
- **Null Handling**: Handle null/undefined values appropriately
- **Formatting**: Format data for client consumption

## Error Handling and Troubleshooting

### Common Issues

1. **Missing SKU**
   - **Cause**: Product doesn't have SKU or SKU is null
   - **Solution**: Ensure SKU is available in the product data
   - **Reference**: Check product data structure

2. **Product Stock Service Unavailable**
   - **Cause**: Adobe Commerce API is down or unreachable
   - **Solution**: Check Adobe Commerce instance status
   - **Reference**: Verify API endpoint configuration

3. **Authentication Failures**
   - **Cause**: Invalid or missing authentication headers
   - **Solution**: Verify authentication configuration
   - **Reference**: Check API Mesh authentication setup

4. **Data Type Mismatches**
   - **Cause**: Expected data type doesn't match actual response
   - **Solution**: Ensure proper type conversion in resolver
   - **Reference**: Check resolver implementation

### Debugging Tips

- **Enable GraphQL Debugging**: Use GraphQL playground to test queries
- **Check Network Requests**: Monitor API calls to product stock service
- **Verify Context**: Ensure context contains required services
- **Test Individual Resolvers**: Test resolver logic in isolation

## Performance Considerations

### 1. **Caching Strategy**
- **Response Caching**: API Mesh caches responses for 600 seconds
- **Resolver Caching**: Consider implementing resolver-level caching
- **Data Freshness**: Balance cache duration with data accuracy needs

### 2. **Batch Resolution**
- **N+1 Problem**: Avoid making individual API calls for each product
- **DataLoader Pattern**: Consider implementing DataLoader for batch resolution
- **Efficient Queries**: Optimize GraphQL queries to minimize resolver calls

### 3. **Resource Management**
- **Connection Pooling**: Use connection pooling for API calls
- **Timeout Handling**: Implement proper timeout handling
- **Error Recovery**: Implement retry logic for transient failures

## Security Considerations

### 1. **Authentication**
- **Header Propagation**: Ensure authentication headers are properly propagated
- **Service Access**: Verify service access permissions
- **Token Validation**: Validate authentication tokens

### 2. **Data Access**
- **Authorization**: Implement proper authorization checks
- **Data Filtering**: Filter sensitive data appropriately
- **Rate Limiting**: Implement rate limiting for API calls

### 3. **Input Validation**
- **SKU Validation**: Validate SKU format and content
- **Parameter Sanitization**: Sanitize all input parameters
- **Error Information**: Avoid exposing sensitive error information

## Testing and Validation

### 1. **Unit Testing**
- **Resolver Logic**: Test resolver logic in isolation
- **Mock Services**: Use mock services for testing
- **Error Scenarios**: Test error handling scenarios

### 2. **Integration Testing**
- **End-to-End Queries**: Test complete GraphQL queries
- **Service Integration**: Test integration with backend services
- **Performance Testing**: Test resolver performance under load

### 3. **Schema Validation**
- **Type Compatibility**: Ensure resolver return types match schema
- **Field Resolution**: Verify all fields resolve correctly
- **Schema Evolution**: Test schema changes and migrations

## Future Enhancements

### 1. **Additional Product Types**
- **Configurable Products**: Add support for configurable product stock
- **Virtual Products**: Handle virtual product stock logic
- **Grouped Products**: Implement grouped product stock calculation

### 2. **Advanced Features**
- **Stock Alerts**: Implement low stock alerts
- **Stock History**: Add stock history tracking
- **Multi-location**: Support multi-location inventory

### 3. **Performance Improvements**
- **Batch Resolution**: Implement batch resolution for multiple products
- **Caching Strategy**: Implement more sophisticated caching
- **Data Preloading**: Preload stock data for better performance

### 4. **Monitoring and Observability**
- **Metrics Collection**: Collect resolver performance metrics
- **Error Tracking**: Implement comprehensive error tracking
- **Health Checks**: Add health checks for stock service integration 
