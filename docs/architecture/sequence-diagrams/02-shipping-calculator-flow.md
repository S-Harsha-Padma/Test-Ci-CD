# Shipping Calculator Flow Sequence Diagram

## Overview
This diagram shows the shipping calculation flow from cart to shipping method selection, including multi-carrier integration and tax calculation.

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant EDS as Edge Delivery Service
    participant API as API Mesh
    participant Shipping as Shipping Webhook
    participant UPS as UPS API
    participant FedEx as FedEx API
    participant USPS as USPS API
    participant Tax as Tax Calculator
    participant Commerce as Adobe Commerce
    participant State as Adobe I/O State

    Client->>EDS: Add shipping address
    EDS->>API: POST /shipping/calculate
    API->>Shipping: Trigger shipping calculation
    Shipping->>Commerce: Get cart items and address
    Commerce-->>Shipping: Cart data

    Shipping->>UPS: Calculate UPS rates
    UPS-->>Shipping: UPS rates and delivery times
    Shipping->>FedEx: Calculate FedEx rates
    FedEx-->>Shipping: FedEx rates and delivery times
    Shipping->>USPS: Calculate USPS rates
    USPS-->>Shipping: USPS rates and delivery times

    Shipping->>Tax: Calculate shipping tax
    Tax->>Tax: Vertex/Zonos tax calculation
    Tax-->>Shipping: Tax amount for each method

    Shipping->>State: Cache shipping rates
    State-->>Shipping: Rates cached
    Shipping->>Commerce: Update shipping methods
    Commerce-->>Shipping: Methods updated
    Shipping-->>API: Shipping options with rates
    API-->>EDS: Available shipping methods
    EDS-->>Client: Shipping options displayed

    Client->>EDS: Select shipping method
    EDS->>API: POST /shipping/select
    API->>Shipping: Update selected method
    Shipping->>Commerce: Update cart with shipping
    Commerce-->>Shipping: Cart updated
    Shipping-->>API: Shipping confirmation
    API-->>EDS: Shipping method confirmed
    EDS-->>Client: Shipping method selected
```

## Key Components

### Shipping Webhook (`actions/commerce/webhook/shipping/`)
- **index.js**: Main shipping calculation orchestrator
- **validation.js**: Validates shipping addresses and requirements
- **methods/**: Carrier-specific implementations
  - **ups.js**: UPS API integration
  - **fedex.js**: FedEx API integration
  - **usps.js**: USPS API integration
  - **warehouse.js**: Custom warehouse shipping
  - **carrier.js**: Generic carrier interface

### Tax Integration (`actions/commerce/webhook/tax/`)
- **calculate.js**: Main tax calculation orchestrator
- **vertex/**: Vertex tax service integration
- **zonos/**: Zonos tax service integration

### Shipping Calculation Steps
1. **Address Validation**: Validate shipping address format
2. **Multi-Carrier Rate Calculation**: Get rates from UPS, FedEx, USPS
3. **Tax Calculation**: Calculate taxes for each shipping method
4. **Rate Caching**: Cache calculated rates for performance
5. **Method Selection**: User selects preferred shipping method

### Error Handling
- Invalid shipping addresses
- Carrier API failures
- Tax calculation errors
- Rate caching failures

### Performance Optimizations
- Rate caching in Adobe I/O State
- Parallel carrier API calls
- Tax calculation optimization
- Shipping method filtering 
