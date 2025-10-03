# AITrader Documentation

Welcome to the centralized documentation for the AITrader project. This directory contains all project documentation organized by category.

## � **IMPORTANT: Before Making Changes**
- **[📝 CHANGELOG.md](./CHANGELOG.md)** - **REQUIRED**: Always update with timestamped entries before making changes

## �📁 Documentation Structure

### 🔧 [Development](./development/)
- **[DEVELOPMENT_WORKFLOW.md](./development/DEVELOPMENT_WORKFLOW.md)** - Decision tree for choosing development scripts
- **[DEVELOPMENT.md](./development/DEVELOPMENT.md)** - Fast frontend development guide with multiple approaches
- **[BACKEND_ARCH.md](./architecture/BACKEND_ARCH.md)** - Backend architecture overview
- **[BACKEND_INTERFACES.md](./architecture/BACKEND_INTERFACES.md)** - Backend API interfaces and contracts
- **[API_DOCUMENTATION.md](./api/API_DOCUMENTATION.md)** - Enhanced Predictions & Sentiment API documentation

- **[DESIGN_SYSTEM.md](./frontend/DESIGN_SYSTEM.md)** - Complete UI design system and container guardrails
- **[FRONTEND_INSTRUCTIONS.md](./frontend/FRONTEND_INSTRUCTIONS.md)** - Frontend development instructions
- **[BACKGROUND_INSTRUCTIONS.md](./services/BACKGROUND_INSTRUCTIONS.md)** - Backend service development instructions
- **[STRATEGY_ENGINE_ML_INTEGRATION.md](./services/STRATEGY_ENGINE_ML_INTEGRATION.md)** - ML integration details
- **[copilot-instructions.md](./instructions/copilot-instructions.md)** - GitHub Copilot instruction file (authoritative)

- **[TENSORRT.md](./advanced/TENSORRT.md)** - TensorRT GPU acceleration setup and optimization

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current project status and implementation progress


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

- **Keep documentation current**: Update docs when making changes
- **Use proper linking**: Reference other docs using relative paths

This documentation was centralized from scattered `.md` files throughout the project:
- Top-level docs moved to appropriate categories
- `.github/*.md` files organized by purpose

- Check the main [README.md](../README.md) for project overview
- Refer to [copilot-instructions.md](./instructions/copilot-instructions.md) for development guidance
Maintenance and cleanup: **[MAINTENANCE.md](./MAINTENANCE.md)** - developer maintenance tasks and cleanup commands