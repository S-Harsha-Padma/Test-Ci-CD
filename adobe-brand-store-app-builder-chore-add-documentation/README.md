# Adobe Brand Store App Builder

A comprehensive Adobe I/O Runtime (App Builder) application that powers Adobe's brand store e-commerce platform. This serverless backend service integrates Adobe Commerce (Magento) with third-party services, payment gateways, shipping providers, and enterprise systems.

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- Adobe I/O CLI
- Adobe Developer Console access
- Adobe Commerce instance

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd adobe-brand-store-app-builder

# Install dependencies
npm install

# Configure environment
cp env.dist .env
# Edit .env with your configuration

# Deploy to Adobe I/O Runtime
aio app deploy
```

### Development Setup
```bash
# Run tests
npm test

# Run linting
npm run lint

# Run formatting
npm run format
```

## 📁 Project Structure

```
adobe-brand-store-app-builder/
├── actions/                    # Adobe I/O Runtime actions
│   ├── commerce/              # Commerce-related functionality
│   │   ├── webhook/           # Webhook handlers
│   │   ├── events/            # Event processing
│   │   ├── customer/          # Customer management
│   │   ├── product/           # Product operations
│   │   └── inventory/         # Inventory management
│   ├── account/               # Authentication & SSO
│   └── ups/                   # UPS integration
├── lib/                       # Shared libraries
├── scripts/                   # Configuration scripts
├── resolvers/                 # GraphQL resolvers
├── requestSchema/             # API request schemas
├── responseSchema/            # API response schemas
├── test/                      # Test files
├── docs/                      # Documentation
│   ├── architecture/          # Architecture documentation
│   │   └── sequence-diagrams/ # System interaction diagrams
│   ├── actions-documentation/ # Action-specific docs
│   ├── scripts-documentation/ # Script documentation
│   ├── resolvers-documentation/ # Resolver documentation
│   ├── lib-documentation/     # Library documentation
│   ├── requestSchema-documentation/ # Request schema docs
│   └── responseSchema-documentation/ # Response schema docs
└── .cursor/rules/             # Cursor IDE configuration
```

## 🔧 Core Functionality

### E-commerce Operations
- **Payment Processing**: Authorize.net integration with webhook validation
- **Shipping Calculation**: Multi-carrier support (UPS, FedEx, USPS) with tax integration
- **Order Management**: Complete order lifecycle with ERP integration
- **Inventory Sync**: Real-time inventory synchronization via SFTP
- **Customer Management**: SSO authentication with Adobe IMS

### Integration Points
- **Adobe Commerce**: Primary e-commerce platform integration
- **Payment Gateways**: Authorize.net, OOPE payment processing
- **Shipping Carriers**: UPS, FedEx, USPS, custom warehouse shipping
- **Tax Services**: Vertex and Zonos tax calculation
- **ERP Systems**: SOAP-based enterprise system integration

### API Mesh & GraphQL
- **API Federation**: GraphQL federation layer for unified API
- **Schema Extension**: Custom resolvers for product stock and customer data
- **Request/Response Validation**: JSON Schema validation for all endpoints

## 🛠️ Development Guide

### Technology Stack
- **Runtime**: Adobe I/O Runtime (Node.js 22)
- **E-commerce**: Adobe Commerce (Magento)
- **Frontend**: Edge Delivery Service (EDS)
- **API Layer**: GraphQL with API Mesh
- **Authentication**: OAuth 1.0a, Adobe IMS
- **State Management**: Adobe I/O State
- **Testing**: Jest framework
- **CI/CD**: GitHub Actions

### Configuration Scripts
- **Event Configuration**: `scripts/configure-events.js`
- **Commerce Events**: `scripts/configure-commerce-events.js`
- **Payment Methods**: `scripts/create-payment-methods.js`
- **Shipping Carriers**: `scripts/create-shipping-carriers.js`

### IDE Integration

#### Cursor IDE Support
This project includes comprehensive Cursor IDE integration to enhance your development experience:

- **📖 Project Context**: `.cursor/rules/project-context.mdx` - Comprehensive project context for AI assistance
- **AI-Powered Development**: The context file provides detailed information about:
  - Project architecture and technology stack
  - Directory structure and component relationships
  - Development patterns and best practices
  - API documentation and integration points
  - Testing and deployment workflows

The Cursor rules file helps the AI understand the project structure, making code suggestions, refactoring, and debugging more accurate and contextual.

## 📚 Documentation Index

### 📖 Future Roadmap
- **[Future Roadmap](docs/FUTURE_ROADMAP.md)**: Project roadmap with planned features and development phases

### Architecture & System Design
- **[Sequence Diagrams](docs/architecture/sequence-diagrams/README.md)**: Visual system interaction flows
  - [Payment Processing Flow](docs/architecture/sequence-diagrams/01-payment-processing-flow.md)
  - [Shipping Calculator Flow](docs/architecture/sequence-diagrams/02-shipping-calculator-flow.md)
  - [Order Processing Flow](docs/architecture/sequence-diagrams/03-order-processing-flow.md)
  - [Inventory Synchronization Flow](docs/architecture/sequence-diagrams/04-inventory-sync-flow.md)
  - [Authentication Flow](docs/architecture/sequence-diagrams/05-authentication-flow.md)
  - [CI/CD Deployment Flow](docs/architecture/sequence-diagrams/06-ci-cd-deployment-flow.md)

### Component Documentation
- **[Actions Documentation](actions-documentation/)**: Detailed breakdown of all action handlers
- **[Library Documentation](lib-documentation/)**: Core library and utility functions
- **[Scripts Documentation](scripts-documentation/)**: Configuration and setup scripts
- **[Resolvers Documentation](resolvers-documentation/)**: GraphQL schema extensions
- **[Schema Documentation](requestSchema-documentation/)** & **[Response Schemas](responseSchema-documentation/)**: API validation schemas

### Development & Deployment
- **[CI/CD Documentation](CICD.md)**: GitHub Actions workflows and deployment processes
- **[Improvement Recommendations](CI-CD-IMPROVEMENTS.md)**: Identified gaps and enhancement opportunities

## 🔒 Security

### Authentication & Authorization
- **OAuth 1.0a**: Secure API authentication
- **Adobe IMS**: Single Sign-On integration
- **Webhook Verification**: Secure webhook signature validation
- **Session Management**: Secure state management with Adobe I/O State

### Data Protection
- **Encryption**: Secure data transmission and storage
- **Secrets Management**: Secure credential handling
- **Input Validation**: Comprehensive request/response validation
- **Error Handling**: Secure error message handling

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Jest-based component testing
- **Integration Tests**: API endpoint testing
- **Webhook Tests**: Payment and shipping webhook validation
- **Library Tests**: Core utility function testing

### Test Execution
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:actions
npm run test:lib
```

## 🚀 Deployment

### Environment Management
- **Development**: Local development with hot reloading
- **Staging**: Pre-production testing environment
- **Production**: Live application deployment

### Deployment Process
```bash
# Deploy to staging
aio app deploy --env stage

# Deploy to production
aio app deploy --env prod
```

## 🔗 Integration Points

### External Services
- **Adobe Commerce**: Primary e-commerce platform
- **Payment Gateways**: Authorize.net, OOPE
- **Shipping Carriers**: UPS, FedEx, USPS
- **Tax Services**: Vertex, Zonos
- **ERP Systems**: Enterprise resource planning integration
- **SFTP Servers**: Inventory file processing

### API Endpoints
- **GraphQL**: Unified API through API Mesh
- **REST APIs**: Direct service integrations
- **Webhooks**: Event-driven processing
- **SOAP APIs**: Enterprise system integration

## 📈 Scalability

### Performance Optimizations
- **Caching**: Adobe I/O State for data caching
- **Parallel Processing**: Concurrent API calls
- **Batch Operations**: Efficient bulk data processing
- **Connection Pooling**: Optimized HTTP client management

### Monitoring & Observability
- **Health Checks**: Application health monitoring
- **Performance Metrics**: Response time and throughput tracking
- **Error Tracking**: Comprehensive error logging and alerting
- **Deployment Monitoring**: Real-time deployment status tracking

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch
3. **Implement** changes with tests
4. **Run** linting and tests
5. **Submit** a pull request

### Code Standards
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Jest**: Comprehensive testing
- **Documentation**: Inline and external documentation

## 📄 License

This project is licensed under the Adobe License. See [LICENSE](LICENSE) for details.

## 🆘 Support

### Getting Help
- **Documentation**: Comprehensive documentation in `/docs`
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Team Support**: Contact the development team for urgent issues

### Resources
- **Adobe I/O Documentation**: [Adobe Developer Console](https://developer.adobe.com/)
- **Adobe Commerce**: [Magento Documentation](https://devdocs.magento.com/)
- **API Mesh**: [GraphQL Federation](https://www.apollographql.com/docs/federation/)
- **GitHub Actions**: [CI/CD Documentation](https://docs.github.com/en/actions)

---

*Built with ❤️ by the Adobe Brand Store Team*
