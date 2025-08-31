# Order Processing Flow Sequence Diagram

## Overview
This diagram shows the complete order processing flow from order creation to fulfillment, including ERP integration and shipping label generation.

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant EDS as Edge Delivery Service
    participant API as API Mesh
    participant Events as Order Events
    participant Commerce as Adobe Commerce
    participant ERP as ERP System
    participant FedEx as FedEx API
    participant Invoice as Invoice Service
    participant State as Adobe I/O State

    Client->>EDS: Complete checkout
    EDS->>API: POST /order/create
    API->>Events: Trigger order creation event
    Events->>Commerce: Create order in Magento
    Commerce-->>Events: Order created with ID
    Events->>State: Cache order data
    State-->>Events: Order cached
    Events-->>API: Order creation response
    API-->>EDS: Order confirmation
    EDS-->>Client: Order placed successfully

    Events->>ERP: Send order to ERP system
    ERP-->>Events: Order received and processed
    Events->>Commerce: Update order status to "Processing"
    Commerce-->>Events: Status updated

    ERP->>ERP: Inventory allocation
    ERP->>ERP: Pick and pack process
    ERP-->>Events: Order ready for shipping

    Events->>FedEx: Generate shipping label
    FedEx-->>Events: Shipping label and tracking
    Events->>Commerce: Update order with tracking
    Commerce-->>Events: Tracking info updated

    Events->>Invoice: Generate invoice
    Invoice->>Invoice: Create invoice document
    Invoice-->>Events: Invoice generated
    Events->>Commerce: Attach invoice to order
    Commerce-->>Events: Invoice attached

    Events->>State: Update order status
    State-->>Events: Status cached
    Events-->>API: Order fulfillment complete
    API-->>EDS: Fulfillment notification
    EDS-->>Client: Order shipped notification
```

## Key Components

### Order Events (`actions/commerce/events/order/`)
- **create/index.js**: Handles order creation process
- **status/index.js**: Manages order status updates
- **fedex/index.js**: FedEx integration for shipping labels
- **invoice/create.js**: Invoice generation service
- **client/soap_client.js**: ERP system integration

### Order Processing Steps
1. **Order Creation**: Order created in Commerce system
2. **ERP Integration**: Order sent to ERP for processing
3. **Inventory Management**: Stock allocation and pick/pack
4. **Shipping Label Generation**: FedEx label creation
5. **Invoice Generation**: Automatic invoice creation
6. **Status Updates**: Real-time status tracking

### ERP Integration
- **SOAP Client**: Handles ERP system communication
- **Order Synchronization**: Bidirectional order sync
- **Inventory Updates**: Real-time stock updates
- **Status Synchronization**: Order status tracking

### Error Handling
- Order creation failures
- ERP communication errors
- Shipping label generation failures
- Invoice generation errors
- Status synchronization issues

### State Management
- Order data caching
- Status tracking
- Error state management
- Retry mechanisms 
