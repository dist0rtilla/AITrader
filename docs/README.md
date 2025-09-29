# AITrader Documentation

Welcome to the centralized documentation for the AITrader project. This directory contains all project documentation organized by category.

## � **IMPORTANT: Before Making Changes**
- **[📝 CHANGELOG.md](./CHANGELOG.md)** - **REQUIRED**: Always update with timestamped entries before making changes

## �📁 Documentation Structure

### 🔧 [Development](./development/)
- **[DEVELOPMENT_WORKFLOW.md](./development/DEVELOPMENT_WORKFLOW.md)** - Decision tree for choosing development scripts
- **[DEVELOPMENT.md](./development/DEVELOPMENT.md)** - Fast frontend development guide with multiple approaches
- **[BUILD_INSTRUCTIONS.md](./development/BUILD_INSTRUCTIONS.md)** - Build and deployment instructions
- **[PORT_MAPPING.md](./development/PORT_MAPPING.md)** - Port allocation strategy and conflict resolution

### 🏗️ [Architecture](./architecture/)
- **[BACKEND_ARCH.md](./architecture/BACKEND_ARCH.md)** - Backend architecture overview
- **[BACKEND_INTERFACES.md](./architecture/BACKEND_INTERFACES.md)** - Backend API interfaces and contracts
- **[SERVICE_MAP.md](./architecture/SERVICE_MAP.md)** - Visual service architecture and connections
- **[Backend README](../backend/README.md)** - Backend service setup and API documentation

### 🌐 [API](./api/)
- **[API_DOCUMENTATION.md](./api/API_DOCUMENTATION.md)** - Enhanced Predictions & Sentiment API documentation

### 🎨 [Frontend](./frontend/)
- **[DESIGN_SYSTEM.md](./frontend/DESIGN_SYSTEM.md)** - Complete UI design system and container guardrails
- **[FRONTEND_INSTRUCTIONS.md](./frontend/FRONTEND_INSTRUCTIONS.md)** - Frontend development instructions
- **[DARK_GLASS_UI_TRANSFORMATION.md](./frontend/DARK_GLASS_UI_TRANSFORMATION.md)** - Dark glass morphism UI design system
- **[Frontend README](../frontend/README.md)** - Frontend project README (located in frontend/ directory)

### 🔧 [Services](./services/)
- **[BACKGROUND_INSTRUCTIONS.md](./services/BACKGROUND_INSTRUCTIONS.md)** - Backend service development instructions
- **[STRATEGY_ENGINE_ML_INTEGRATION.md](./services/STRATEGY_ENGINE_ML_INTEGRATION.md)** - ML integration details
- **[mock_mcp.md](./services/mock_mcp.md)** - Mock MCP Service for development (NEW)
- **[pattern_engine.md](./services/pattern_engine.md)** - Pattern Engine service documentation
- **[sentiment_engine.md](./services/sentiment_engine.md)** - Sentiment Engine service documentation
- **[strategy_engine.md](./services/strategy_engine.md)** - Strategy Engine service documentation
- **[finbert_server.md](./services/finbert_server.md)** - FinBERT Server service documentation

### 📋 [Instructions](./instructions/)
- **[copilot-instructions.md](./instructions/copilot-instructions.md)** - GitHub Copilot instruction file (authoritative)

### ⚡ [Advanced](./advanced/)
- **[TENSORRT.md](./advanced/TENSORRT.md)** - TensorRT GPU acceleration setup and optimization

### 📊 Project Status
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current project status and implementation progress

## 🚀 Quick Start

1. **For Development**: Start with [DEVELOPMENT.md](./development/DEVELOPMENT.md)
2. **For Environment Setup**: Copy `.env.example` to `.env` and configure
3. **For Architecture**: See [SERVICE_MAP.md](./architecture/SERVICE_MAP.md)
4. **For API Integration**: Check [API_DOCUMENTATION.md](./api/API_DOCUMENTATION.md)
5. **For UI Development**: Read [FRONTEND_INSTRUCTIONS.md](./frontend/FRONTEND_INSTRUCTIONS.md)

## ⚙️ Environment Configuration

Before running the project, copy the environment template:
```bash
cp .env.example .env
```

The `.env.example` file contains all necessary environment variables with defaults suitable for development. Key variables include:
- Database connections (PostgreSQL, Redis)
- Service URLs (MCP, ONNX, Sentiment, TensorRT)  
- Model paths and trading parameters
- Development flags and testing options

## 📝 Documentation Guidelines

- **Keep documentation current**: Update docs when making changes
- **Use proper linking**: Reference other docs using relative paths
- **Follow naming conventions**: Use descriptive, consistent file names
- **Include examples**: Provide code samples and usage examples

## 🔄 Recently Centralized

This documentation was centralized from scattered `.md` files throughout the project:
- Top-level docs moved to appropriate categories
- `.github/*.md` files organized by purpose
- Service-specific READMEs copied to services directory
- All references updated to new locations

## 📞 Need Help?

- Check the main [README.md](../README.md) for project overview
- Refer to [copilot-instructions.md](./instructions/copilot-instructions.md) for development guidance
- Review [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current implementation status