# GraphQL Schema Extension

## Overview

This document covers GraphQL schema extension patterns and best practices used in the Adobe Brand Store App Builder. It explains how resolvers extend the existing GraphQL schema to add custom functionality and integrate with backend services.

## Schema Extension Patterns

### 1. **Type Extension**

**Purpose**: Extend existing GraphQL types with additional fields that are resolved by custom logic.

**Pattern**:
```graphql
extend type ExistingType { 
  newField: FieldType 
}
```

**Example**:
```graphql
extend type SimpleProductView { 
  qty: ID 
}
```

**Key Benefits**:
- **Non-breaking**: Extends existing types without modifying original schema
- **Modular**: Allows incremental addition of functionality
- **Composable**: Multiple extensions can be applied to the same type

### 2. **Resolver Implementation**

**Purpose**: Implement custom resolution logic for extended fields.

**Pattern**:
```javascript
module.exports = {
  resolvers: {
    ExtendedType: {
      newField: {
        selectionSet: '{ requiredField }',
        resolve: (root, args, context, info) => {
          // Custom resolution logic
          return resolvedValue;
        },
      },
    },
  },
};
```

**Key Components**:
- **Selection Set**: Specifies required fields for resolution
- **Resolver Function**: Implements the custom logic
- **Context Integration**: Accesses backend services through context

## API Mesh Integration

### 1. **Configuration Structure**

The API Mesh configuration in `mesh.json` defines schema extensions:

```json
{
  "additionalTypeDefs": "extend type SimpleProductView { qty: ID }",
  "additionalResolvers": ["./resolvers/stock-resolvers.js"]
}
```

**Configuration Elements**:
- **`additionalTypeDefs`**: GraphQL schema extensions
- **`additionalResolvers`**: Array of resolver file paths
- **Service Integration**: Backend services for data resolution

### 2. **Service Integration**

**Backend Service Configuration**:
```json
{
  "name": "productStock",
  "handler": {
    "JsonSchema": {
      "baseUrl": "https://runtime-url/api/v1/web/product",
      "operations": [
        {
          "type": "Query",
          "field": "productStock",
          "path": "/stock?sku={args.sku}",
          "method": "GET"
        }
      ]
    }
  }
}
```

**Context Access**:
```javascript
// Access service through context
context.productStock.Query.productStock({
  root,
  args: { sku: root.sku },
  context,
  info,
})
```

## Common Patterns and Best Practices

### 1. **Selection Set Management**

**Purpose**: Ensure required data is available for resolution.

**Best Practices**:
- **Minimal Selection**: Only request fields actually needed
- **Dependency Declaration**: Clearly declare field dependencies
- **Performance Optimization**: Avoid over-fetching data

**Example**:
```javascript
{
  selectionSet: '{ sku }',  // Only request SKU field
  resolve: (root, args, context, info) => {
    // SKU is guaranteed to be available
    return context.service.Query.method({ sku: root.sku });
  }
}
```

### 2. **Error Handling**

**Purpose**: Handle resolution failures gracefully.

**Patterns**:
```javascript
resolve: async (root, args, context, info) => {
  try {
    const result = await context.service.Query.method(args);
    return result.data;
  } catch (error) {
    // Return sensible default or null
    return null;
  }
}
```

**Best Practices**:
- **Graceful Degradation**: Return null/default values on errors
- **Error Logging**: Log errors for debugging
- **User Experience**: Don't break entire query on field resolution failure

### 3. **Data Transformation**

**Purpose**: Transform data to match GraphQL schema requirements.

**Patterns**:
```javascript
resolve: (root, args, context, info) => {
  return context.service.Query.method(args)
    .then(response => {
      // Transform data to expected format
      return parseInt(response.qty);
    });
}
```

**Common Transformations**:
- **Type Conversion**: Convert strings to numbers, etc.
- **Format Standardization**: Standardize date formats, etc.
- **Null Handling**: Handle null/undefined values appropriately

## Performance Optimization

### 1. **Caching Strategy**

**API Mesh Caching**:
```json
{
  "responseConfig": {
    "cache": {
      "cacheControl": "public, max-age=600"
    }
  }
}
```

**Resolver-Level Caching**:
```javascript
const cache = new Map();

resolve: (root, args, context, info) => {
  const cacheKey = `${root.sku}-stock`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = context.service.Query.method(args);
  cache.set(cacheKey, result);
  return result;
}
```

### 2. **Batch Resolution**

**N+1 Problem Solution**:
```javascript
// Instead of individual calls
items.map(item => context.service.Query.method({ sku: item.sku }))

// Use batch resolution
const skus = items.map(item => item.sku);
const batchResult = await context.service.Query.batchMethod({ skus });
```

### 3. **Lazy Loading**

**Conditional Resolution**:
```javascript
resolve: (root, args, context, info) => {
  // Only resolve if field is requested
  if (!info.fieldNodes.some(node => 
    node.selectionSet?.selections.some(sel => sel.name.value === 'qty')
  )) {
    return null;
  }
  
  return context.service.Query.method(args);
}
```

## Security Considerations

### 1. **Authentication**

**Header Propagation**:
```json
{
  "operationHeaders": {
    "Authorization": "{context.headers['authorization']}",
    "x-gw-ims-org-id": "{context.headers['x-gw-ims-org-id']}"
  }
}
```

**Context Validation**:
```javascript
resolve: (root, args, context, info) => {
  if (!context.headers?.authorization) {
    throw new Error('Authentication required');
  }
  
  return context.service.Query.method(args);
}
```

### 2. **Input Validation**

**Parameter Sanitization**:
```javascript
resolve: (root, args, context, info) => {
  const sku = root.sku?.trim();
  
  if (!sku || sku.length === 0) {
    return null;
  }
  
  return context.service.Query.method({ sku });
}
```

### 3. **Data Access Control**

**Authorization Checks**:
```javascript
resolve: (root, args, context, info) => {
  // Check user permissions
  if (!context.user?.canAccessStock) {
    return null;
  }
  
  return context.service.Query.method(args);
}
```

## Testing and Validation

### 1. **Unit Testing**

**Resolver Testing**:
```javascript
describe('Stock Resolver', () => {
  it('should resolve stock quantity', async () => {
    const mockContext = {
      productStock: {
        Query: {
          productStock: jest.fn().mockResolvedValue({ qty: 42 })
        }
      }
    };
    
    const result = await resolver.resolve(
      { sku: 'TEST-SKU' }, 
      {}, 
      mockContext, 
      {}
    );
    
    expect(result).toBe(42);
  });
});
```

### 2. **Integration Testing**

**End-to-End Testing**:
```graphql
query TestStockResolution {
  products(filter: { sku: { eq: "TEST-SKU" } }) {
    items {
      sku
      qty
    }
  }
}
```

### 3. **Schema Validation**

**Type Compatibility**:
```javascript
// Ensure resolver return type matches schema
const schema = buildSchema(`
  extend type SimpleProductView { 
    qty: ID 
  }
`);

const resolver = {
  SimpleProductView: {
    qty: (root) => parseInt(root.qty)
  }
};
```

## Future Enhancements

### 1. **Advanced Schema Extensions**

**Interface Extensions**:
```graphql
extend interface ProductInterface {
  stockInfo: StockInfo
}

type StockInfo {
  quantity: Int
  status: StockStatus
  lastUpdated: DateTime
}
```

**Union Types**:
```graphql
extend type Query {
  productData(sku: String!): ProductData
}

union ProductData = SimpleProduct | ConfigurableProduct | BundleProduct
```

### 2. **Dynamic Schema Generation**

**Runtime Schema Extension**:
```javascript
const generateSchemaExtension = (productTypes) => {
  return productTypes.map(type => 
    `extend type ${type} { qty: ID }`
  ).join('\n');
};
```

### 3. **Advanced Resolver Patterns**

**Field-Level Permissions**:
```javascript
resolve: (root, args, context, info) => {
  const fieldName = info.fieldName;
  const permissions = context.user?.permissions;
  
  if (!permissions?.includes(`read:${fieldName}`)) {
    return null;
  }
  
  return context.service.Query.method(args);
}
```

**Conditional Resolution**:
```javascript
resolve: (root, args, context, info) => {
  const shouldResolve = context.features?.stockResolution;
  
  if (!shouldResolve) {
    return null;
  }
  
  return context.service.Query.method(args);
}
```

This documentation provides comprehensive guidance on GraphQL schema extension patterns and best practices for the Adobe Brand Store App Builder. 
