# Commerce Webhooks - Detailed Documentation

## Overview

The `actions/commerce/webhook/` directory contains real-time webhook handlers that process various e-commerce events from Adobe Commerce. These webhooks are triggered during the checkout process and provide real-time validation, calculation, and processing capabilities.

## Directory Structure

```
actions/commerce/webhook/
├── cart/
│   └── discounts/
│       └── index.js
├── gift-card/
│   └── redeem/
│       └── index.js
├── payment/
│   ├── filter.js
│   └── validate.js
├── product/
│   └── add-to-cart.js
├── shipping/
│   ├── index.js
│   ├── validation.js
│   └── methods/
│       ├── carrier.js
│       ├── fedex.js
│       ├── ups.js
│       ├── usps.js
│       └── warehouse.js
└── tax/
    ├── calculate.js
    ├── vertex/
    │   └── http/
    │       └── client/
    │           └── soap.js
    └── zonos/
        └── index.js
```

## Core Webhook Handlers

### 1. Payment Processing (`payment/`)

#### `payment/validate.js`
**Purpose**: Validates and processes payments during checkout

**Key Features**:
- **Authorize.net Integration**: Handles token-based payment transactions
- **Payment Nonce Validation**: Ensures payment tokens are present
- **Transaction Capture**: Authorizes and captures payments in real-time
- **Order Status Updates**: Adds transaction IDs to order history

**Workflow**:
1. Verifies webhook signature for security
2. Extracts payment information from request body
3. Validates payment method (Authorize.net)
4. Checks for required payment nonce
5. Processes payment through Authorize.net API
6. Updates order with transaction details
7. Returns success/error response

**Configuration**:
- `AUTHORIZENET_PAYMENT_METHOD`: Payment method code
- `TRANSACTION_KEY`: Authorize.net transaction key
- `API_LOGIN_ID`: Authorize.net API login ID
- `TRANSACTION_ENVIRONMENT`: Production/staging environment

#### `payment/filter.js`
**Purpose**: Filters payment methods based on customer groups

**Key Features**:
- **Customer Group Filtering**: Restricts payment methods by customer group
- **PO Eligibility**: Special handling for purchase order eligible customers
- **Payment Method Validation**: Ensures appropriate payment methods are available

### 2. Shipping & Logistics (`shipping/`)

#### `shipping/index.js`
**Purpose**: Main shipping webhook handler for rate calculation and method selection

**Key Features**:
- **Multi-Carrier Support**: UPS, FedEx, USPS, Warehouse Pickup, Custom Carriers
- **Real-time Rate Calculation**: Dynamic shipping cost computation
- **Address Validation**: UPS address verification integration
- **Customer Group Filtering**: Group-specific shipping options
- **Shipping Restrictions**: Product-based shipping limitations

**Supported Carriers**:
- **UPS**: Address validation and rate calculation
- **FedEx**: Multiple service levels and tracking
- **USPS**: Domestic shipping options
- **Warehouse Pickup**: Local pickup functionality
- **Custom Carriers**: Extensible carrier system

**Workflow**:
1. Verifies webhook signature
2. Validates shipping restrictions for products
3. Calls individual carrier rate calculation methods
4. Aggregates all available shipping methods
5. Returns formatted shipping options

#### `shipping/methods/` - Carrier-Specific Implementations

**`carrier.js`**: Generic carrier implementation
- Extensible framework for custom carriers
- Configurable rate calculation logic
- Support for custom shipping rules

**`fedex.js`**: FedEx integration
- Multiple service level support
- Real-time rate calculation
- Tracking number generation
- International shipping support

**`ups.js`**: UPS integration
- Address validation services
- Rate calculation with multiple service options
- Package dimension handling
- Domestic and international shipping

**`usps.js`**: USPS integration
- Domestic shipping services
- Priority and standard mail options
- Package size and weight validation

**`warehouse.js`**: Warehouse pickup
- Local pickup location management
- Pickup time slot handling
- Inventory availability checking

#### `shipping/validation.js`
**Purpose**: Validates shipping restrictions and product availability

**Features**:
- Product-specific shipping rules
- Geographic restrictions
- Weight and dimension limits
- Customer group-based restrictions

### 3. Tax Calculation (`tax/`)

#### `tax/calculate.js`
**Purpose**: Calculates taxes for orders using multiple tax providers

**Key Features**:
- **Multi-Provider Support**: Vertex (US) and Zonos (International)
- **Tax Exempt Handling**: Customer group-based tax exemptions
- **Gift Card Tax Rules**: Special tax treatment for gift cards
- **Real-time Calculation**: Dynamic tax computation during checkout
- **Country-Specific Logic**: Different providers for different countries

**Tax Providers**:
- **Vertex**: Enterprise tax calculation for US orders
- **Zonos**: International tax and duty calculation

**Workflow**:
1. Verifies webhook signature
2. Checks for tax-exempt customer groups
3. Determines country for tax calculation
4. Routes to appropriate tax provider (Vertex/Zonos)
5. Processes tax calculation request
6. Returns tax calculation results

**Configuration**:
- `VERTEX_SERVICE_URL`: Vertex tax service endpoint
- `VERTEX_TRUST_ID`: Vertex trust identifier
- `ZONOS_API_KEY`: Zonos API credentials
- `ZONOS_API_URL`: Zonos service endpoint
- `TAX_EXEMPT_CLASSES`: Comma-separated list of tax-exempt classes

#### `tax/vertex/` - Vertex Tax Integration
**`vertex/http/client/soap.js`**:
- SOAP client for Vertex tax service
- Request/response handling
- Error processing and validation
- Tax calculation request formatting

#### `tax/zonos/` - Zonos International Tax
**`zonos/index.js`**:
- International tax and duty calculation
- Customs duty estimation
- Import tax computation
- Multi-country support

### 4. Product Management (`product/`)

#### `product/add-to-cart.js`
**Purpose**: Validates product access and customer group permissions

**Key Features**:
- **Customer Group Validation**: Ensures customers can access specific products
- **Bundle Product Support**: Handles complex product bundles
- **Access Control**: Restricts products to authorized customer groups
- **Real-time Validation**: Immediate feedback during cart addition

**Workflow**:
1. Verifies webhook signature
2. Extracts product information from request
3. Handles bundle product selections
4. Retrieves product customer group restrictions
5. Validates customer group permissions
6. Returns success/error response

**Product Types Supported**:
- Simple products
- Configurable products
- Bundle products (with selection validation)

### 5. Gift Card Management (`gift-card/`)

#### `gift-card/redeem/index.js`
**Purpose**: Validates gift card redemption permissions

**Key Features**:
- **Customer Group Restrictions**: Limits gift card usage by customer group
- **Guest User Handling**: Special logic for guest customers
- **CBRE Personnel Restrictions**: Blocks gift card usage for specific groups
- **Purchase Order Validation**: Prevents gift card usage for PO customers

**Workflow**:
1. Verifies webhook signature
2. Extracts cart information
3. Checks if customer is guest user
4. Validates customer group permissions
5. Applies gift card restrictions
6. Returns validation result

**Restrictions**:
- CBRE Personnel cannot redeem gift cards
- Purchase Order Eligible customers are restricted
- Guest users have limited gift card functionality

### 6. Cart Management (`cart/`)

#### `cart/discounts/index.js`
**Purpose**: Manages discount and coupon code restrictions

**Key Features**:
- **Customer Group Filtering**: Removes discounts for specific groups
- **Gift Card Removal**: Eliminates gift cards for restricted customers
- **Coupon Code Management**: Removes coupon codes for certain groups
- **Quote Merge Handling**: Processes discounts during quote operations

**Workflow**:
1. Verifies webhook signature
2. Extracts quote information
3. Identifies customer group
4. Applies discount restrictions
5. Returns discount removal operations

**Restricted Groups**:
- CBRE Personnel
- Purchase Order Eligible customers

## Common Patterns

### Webhook Security
All webhook handlers implement:
- **Signature Verification**: Using `webhookVerify()` function
- **Error Handling**: Comprehensive error catching and logging
- **Response Formatting**: Standardized success/error responses

### Response Formats
**Success Response**:
```javascript
{
  statusCode: HTTP_OK,
  body: {
    op: 'success'
  }
}
```

**Error Response**:
```javascript
{
  statusCode: HTTP_BAD_REQUEST,
  body: {
    op: 'error',
    message: 'Error description'
  }
}
```

### Logging
All handlers use structured logging:
- **Info Level**: General operation tracking
- **Debug Level**: Detailed request/response data
- **Error Level**: Error conditions and stack traces

## Configuration Requirements

### Environment Variables
Each webhook handler requires specific environment variables:
- OAuth credentials for Adobe Commerce
- API keys for third-party services
- Service endpoints and URLs
- Customer group configurations
- Tax and shipping parameters

### Adobe Commerce Integration
- Webhook signature verification
- GraphQL API access
- REST API integration
- Event-driven processing

## Testing

### Test Coverage
Each webhook handler includes:
- Unit tests for core functionality
- Mock service integration
- Error condition testing
- Webhook signature validation tests

### Test Files Location
- `test/actions/commerce/webhook/` - Main test directory
- Individual test files for each webhook handler
- Mock implementations for external services

## Deployment Considerations

### Performance
- Real-time processing requirements
- Response time optimization
- Error handling and retry logic
- Resource utilization monitoring

### Scalability
- Auto-scaling via Adobe I/O Runtime
- Concurrent request handling
- Database connection pooling
- Cache utilization for repeated operations

### Monitoring
- Request/response logging
- Error rate monitoring
- Performance metrics collection
- Service health checks 
