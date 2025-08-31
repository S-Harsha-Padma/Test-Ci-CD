# Authentication Flow Sequence Diagram

## Overview
This diagram shows the authentication flow including SSO login, customer group management, and Adobe IMS integration.

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant EDS as Edge Delivery Service
    participant API as API Mesh
    participant Auth as Authentication Service
    participant AdobeIMS as Adobe IMS
    participant Commerce as Adobe Commerce
    participant State as Adobe I/O State
    participant Group as Customer Group Service

    Client->>EDS: Initiate login
    EDS->>API: POST /auth/login
    API->>Auth: Trigger authentication
    Auth->>AdobeIMS: Validate user credentials
    AdobeIMS-->>Auth: User authenticated
    Auth->>Commerce: Create/update customer account
    Commerce-->>Auth: Customer account info
    Auth->>Group: Get customer group info
    Group->>Commerce: Query customer group
    Commerce-->>Group: Group membership data
    Group-->>Auth: Group information
    Auth->>State: Cache user session
    State-->>Auth: Session cached
    Auth-->>API: Authentication response
    API-->>EDS: Login successful
    EDS-->>Client: User logged in

    Client->>EDS: Access protected resource
    EDS->>API: GET /customer/profile
    API->>Auth: Validate session token
    Auth->>State: Check cached session
    State-->>Auth: Session valid
    Auth->>Commerce: Get customer profile
    Commerce-->>Auth: Customer profile data
    Auth-->>API: Profile data
    API-->>EDS: Customer profile
    EDS-->>Client: Profile displayed

    Client->>EDS: Update customer info
    EDS->>API: PUT /customer/update
    API->>Auth: Validate permissions
    Auth->>Commerce: Update customer data
    Commerce-->>Auth: Update successful
    Auth->>State: Update cached data
    State-->>Auth: Cache updated
    Auth-->>API: Update response
    API-->>EDS: Update confirmed
    EDS-->>Client: Profile updated
```

## Key Components

### Authentication Service (`actions/account/`)
- **ssologin.js**: Handles SSO login process
- **validator.js**: Validates authentication data
- **schema.json**: Defines authentication schemas

### Customer Management (`actions/commerce/customer/`)
- **group/index.js**: Customer group management
- **group-name/index.js**: Group name resolution
- **contact-us/**: Contact form processing

### Authentication Steps
1. **Login Initiation**: User initiates login process
2. **Adobe IMS Validation**: Validate credentials with Adobe IMS
3. **Customer Account Creation**: Create/update customer in Commerce
4. **Group Assignment**: Determine customer group membership
5. **Session Caching**: Cache user session data
6. **Profile Management**: Handle customer profile operations

### Security Features
- **OAuth 1.0a**: Secure authentication protocol
- **Session Management**: Secure session handling
- **Permission Validation**: Role-based access control
- **Data Encryption**: Secure data transmission

### Error Handling
- Authentication failures
- Session expiration
- Permission denied errors
- Account creation failures
- Group assignment errors

### State Management
- User session caching
- Profile data caching
- Group membership caching
- Authentication token management 
