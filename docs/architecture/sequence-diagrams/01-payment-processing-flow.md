# Payment Processing Flow Sequence Diagram

## Overview
This diagram shows the complete payment processing flow from cart to payment completion, including webhook handling and payment gateway integration.

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant EDS as Edge Delivery Service
    participant API as API Mesh
    participant Webhook as Payment Webhook
    participant AuthNet as Authorize.net
    participant Commerce as Adobe Commerce
    participant State as Adobe I/O State

    Client->>EDS: Add item to cart
    EDS->>API: POST /cart/add
    API->>Webhook: Trigger add-to-cart webhook
    Webhook->>Commerce: Update cart in Magento
    Commerce-->>Webhook: Cart updated
    Webhook-->>API: Cart response
    API-->>EDS: Cart confirmation
    EDS-->>Client: Cart updated

    Client->>EDS: Proceed to checkout
    EDS->>API: POST /checkout/initiate
    API->>Webhook: Trigger payment validation
    Webhook->>AuthNet: Validate payment method
    AuthNet-->>Webhook: Payment method valid
    Webhook-->>API: Payment validation response
    API-->>EDS: Checkout ready
    EDS-->>Client: Payment form

    Client->>EDS: Submit payment
    EDS->>API: POST /payment/process
    API->>Webhook: Trigger payment processing
    Webhook->>AuthNet: Process payment transaction
    AuthNet-->>Webhook: Payment result
    Webhook->>Commerce: Update order status
    Commerce-->>Webhook: Order updated
    Webhook->>State: Cache payment result
    State-->>Webhook: Cache stored
    Webhook-->>API: Payment response
    API-->>EDS: Payment confirmation
    EDS-->>Client: Payment success/failure
```

## Key Components

### Payment Webhook (`actions/commerce/webhook/payment/`)
- **validate.js**: Validates payment data before processing
- **filter.js**: Filters and routes payment requests
- **accept-payment-transaction-client.js**: Handles Authorize.net integration

### Payment Processing Steps
1. **Cart Addition**: Items added to cart via webhook
2. **Checkout Initiation**: Payment validation and method verification
3. **Payment Processing**: Transaction processing through Authorize.net
4. **Order Update**: Commerce system updated with payment result
5. **State Management**: Payment result cached for future reference

### Error Handling
- Payment validation failures
- Gateway communication errors
- Order update failures
- State management errors

### Security Considerations
- OAuth 1.0a authentication
- Webhook signature verification
- Payment data encryption
- Secure state management 
