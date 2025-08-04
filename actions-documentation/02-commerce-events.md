# Commerce Events - Detailed Documentation

## Overview

The `actions/commerce/events/` directory contains event-driven processing functions that handle Adobe Commerce events. These functions are triggered by various e-commerce events and provide asynchronous processing capabilities for order management, ERP integration, and business logic execution.

## Directory Structure

```
actions/commerce/events/
├── consume.js
└── order/
    ├── actions.config.yaml
    ├── create/
    │   └── index.js
    ├── fed-ex/
    │   └── index.js
    ├── invoice/
    │   └── index.js
    ├── params/
    │   └── index.js
    ├── status/
    │   ├── index.js
    │   └── services/
    │       ├── invoice.js
    │       └── shipment.js
    └── client/
        └── soap_client.js
```

## Core Event Handlers

### 1. Event Consumer (`consume.js`)

**Purpose**: Main event router that receives Adobe Commerce events and routes them to appropriate handlers

**Key Features**:
- **Event Type Routing**: Routes events based on event type
- **Event Code Handling**: Processes different Adobe Commerce event codes
- **Asynchronous Processing**: Handles events without blocking the main flow
- **Error Handling**: Comprehensive error management for event processing

**Supported Event Types**:
- `com.adobe.commerce.observer.sales_order_save_commit_after`: Order creation events
- Additional event types can be easily added

**Workflow**:
1. Receives event from Adobe Commerce
2. Logs event type for debugging
3. Routes to appropriate handler based on event type
4. Returns success response immediately (asynchronous processing)

### 2. Order Processing (`order/`)

#### `order/create/index.js`
**Purpose**: Handles order creation events and initiates ERP integration

**Key Features**:
- **Asynchronous Processing**: Non-blocking order processing
- **ERP Integration**: SOAP-based enterprise system integration
- **State Management**: Stores order data for debugging and tracking
- **Error Handling**: Comprehensive error management and logging

**Workflow**:
1. Receives order creation event
2. Stores order parameters in state (if ERP_LOG enabled)
3. Initiates asynchronous order processing
4. Returns immediate success response
5. Processes order in background:
   - Generates CRM XML payload
   - Sends SOAP request to ERP system
   - Handles ERP response
   - Updates order status

**Configuration**:
- `ERP_LOG`: Enables detailed logging and state storage
- `ERP_ENDPOINT`: SOAP endpoint for ERP system
- Various product SKU configurations for different product types

**State Management**:
- Stores order parameters with 1-year TTL
- Stores generated XML payloads for debugging
- Enables traceability of order processing

#### `order/status/index.js`
**Purpose**: Manages order status updates and synchronization with ERP systems

**Key Features**:
- **Status Synchronization**: Keeps Adobe Commerce and ERP systems in sync
- **Batch Processing**: Handles multiple orders efficiently
- **Error Recovery**: Handles failed status updates gracefully
- **Audit Trail**: Maintains order status history

**Workflow**:
1. Fetches orders from Adobe Commerce
2. Checks ERP system for status updates
3. Updates Adobe Commerce order status
4. Creates invoices and shipments as needed
5. Logs all status changes

#### `order/status/services/`
**`invoice.js`**: Invoice creation and management
- Creates invoices for completed orders
- Handles payment method validation
- Manages invoice status updates
- Integrates with payment gateways

**`shipment.js`**: Shipment creation and tracking
- Creates shipments for orders
- Generates tracking numbers
- Updates shipment status
- Integrates with shipping carriers

#### `order/invoice/index.js`
**Purpose**: Creates invoices for orders based on payment methods

**Key Features**:
- **Payment Method Filtering**: Creates invoices for specific payment methods
- **Authorize.net Integration**: Handles Authorize.net payment processing
- **Invoice Generation**: Creates invoices in Adobe Commerce
- **Status Updates**: Updates order and invoice status

**Workflow**:
1. Receives order data
2. Checks payment method eligibility
3. Creates invoice in Adobe Commerce
4. Updates order status
5. Returns success/error response

#### `order/fed-ex/index.js`
**Purpose**: Adds FedEx cost center information to orders

**Key Features**:
- **FedEx Integration**: Adds FedEx-specific data to orders
- **Cost Center Management**: Handles FedEx cost center assignments
- **Shipping Method Validation**: Validates FedEx shipping methods
- **Order Enhancement**: Adds FedEx data to order attributes

**Workflow**:
1. Receives order data
2. Checks for FedEx shipping methods
3. Adds cost center information
4. Updates order with FedEx data
5. Returns updated order information

#### `order/params/index.js`
**Purpose**: Provides order parameter processing and validation

**Key Features**:
- **Parameter Validation**: Validates order parameters
- **Data Transformation**: Transforms order data as needed
- **Business Logic**: Applies business rules to order processing
- **Error Handling**: Validates and handles parameter errors

### 3. ERP Integration (`order/client/`)

#### `order/client/soap_client.js`
**Purpose**: SOAP client for ERP system integration

**Key Features**:
- **SOAP Request Generation**: Creates XML payloads for ERP system
- **Response Handling**: Processes ERP system responses
- **Error Management**: Handles SOAP communication errors
- **Data Transformation**: Converts between Adobe Commerce and ERP formats

**Key Functions**:

**`generateCrmXmlPayload(params, process, logger)`**:
- Generates XML payload for CRM/ERP system
- Includes order details, customer information, and product data
- Handles different product types (simple, configurable, bundle)
- Applies business rules and transformations

**`sendHaloErpSoapRequest(xmlPayload, endpoint, logger)`**:
- Sends SOAP request to ERP system
- Handles HTTP communication
- Manages timeouts and retries
- Returns raw response data

**`handleResponse(responseText, logger, params)`**:
- Processes ERP system response
- Extracts success/error information
- Logs response details
- Handles different response formats

## Event-Driven Architecture

### Event Flow
1. **Adobe Commerce Event**: Order creation, status change, etc.
2. **Event Consumer**: Routes event to appropriate handler
3. **Event Handler**: Processes event asynchronously
4. **External Integration**: Communicates with ERP, payment, shipping systems
5. **Status Update**: Updates Adobe Commerce with results

### Event Types Supported
- **Order Creation**: `com.adobe.commerce.observer.sales_order_save_commit_after`
- **Order Status Changes**: Various status update events
- **Payment Processing**: Payment-related events
- **Inventory Updates**: Stock level changes

## Configuration

### Environment Variables
Each event handler requires specific configuration:

**ERP Integration**:
- `ERP_ENDPOINT`: SOAP endpoint URL
- `ERP_ORDER_STATUS`: Order status endpoint
- `ERP_AUTH_TOKEN`: Authentication token

**Adobe Commerce**:
- OAuth credentials and scopes
- GraphQL and REST API endpoints
- Webhook configuration

**Product Configuration**:
- Various product SKU mappings
- Gift card and promotional product settings
- Shipping product configurations

### Scheduled Operations
- **ERP Order Status**: Runs every 15 minutes
- **Inventory Updates**: Runs daily at 1 AM
- **Status Synchronization**: Continuous monitoring

## State Management

### Adobe I/O State Library
The events system uses Adobe I/O State for:
- **Order Data Storage**: Storing order parameters and XML payloads
- **Debugging Information**: Logging detailed processing information
- **Error Recovery**: Storing failed operations for retry
- **Audit Trail**: Maintaining processing history

### State Operations
- **Put Operations**: Store order data and processing results
- **Get Operations**: Retrieve stored data for processing
- **TTL Management**: Automatic cleanup of old data
- **Error Handling**: Graceful handling of state operation failures

## Error Handling

### Error Types
- **SOAP Communication Errors**: Network and protocol errors
- **Data Validation Errors**: Invalid order or product data
- **ERP System Errors**: External system failures
- **Adobe Commerce Errors**: API communication issues

### Error Recovery
- **Retry Logic**: Automatic retry for transient failures
- **Error Logging**: Comprehensive error logging and monitoring
- **Graceful Degradation**: Continue processing other orders on failure
- **Manual Intervention**: Support for manual error resolution

## Performance Considerations

### Asynchronous Processing
- **Non-blocking Operations**: Events don't block the main flow
- **Background Processing**: Heavy operations run in background
- **Immediate Response**: Quick response to event triggers
- **Resource Management**: Efficient resource utilization

### Scalability
- **Auto-scaling**: Adobe I/O Runtime handles scaling
- **Concurrent Processing**: Multiple events processed simultaneously
- **Resource Pooling**: Efficient use of connections and resources
- **Load Distribution**: Even distribution of processing load

## Testing

### Test Coverage
- **Unit Tests**: Individual function testing
- **Integration Tests**: End-to-end event processing
- **Mock Services**: Simulated ERP and external services
- **Error Scenarios**: Testing error conditions and recovery

### Test Files
- `test/actions/commerce/events/` - Main test directory
- Individual test files for each event handler
- Mock implementations for external services

## Monitoring and Observability

### Logging
- **Structured Logging**: Consistent log format across all handlers
- **Debug Information**: Detailed logging for troubleshooting
- **Performance Metrics**: Timing and resource usage tracking
- **Error Tracking**: Comprehensive error logging and alerting

### Health Checks
- **Service Availability**: Monitor ERP system availability
- **Processing Status**: Track event processing success rates
- **Performance Monitoring**: Monitor processing times and resource usage
- **Error Rates**: Track and alert on error conditions

## Security

### Authentication
- **OAuth Integration**: Secure authentication with Adobe Commerce
- **ERP Authentication**: Secure communication with ERP systems
- **API Key Management**: Secure storage and usage of API keys
- **Access Control**: Role-based access to event handlers

### Data Protection
- **Encrypted Communication**: Secure communication channels
- **Data Validation**: Input validation and sanitization
- **Audit Logging**: Comprehensive audit trail
- **Compliance**: GDPR and other compliance requirements

## Future Enhancements

### Potential Improvements
- **Event Sourcing**: Implement event sourcing for better audit trails
- **CQRS Pattern**: Command Query Responsibility Segregation
- **Microservices**: Break down into smaller, focused services
- **Real-time Analytics**: Live business intelligence and reporting
- **Machine Learning**: Predictive order processing and optimization 
