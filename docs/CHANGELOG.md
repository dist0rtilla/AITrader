# Changelog

All notable changes to the AITrader project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **ML Inference Architecture**: Established ONNX Runner and TensorRT Runner as parallel services
  - ONNX Runner: CPU-focused inference with multi-provider support (CPU, CUDA, fallback)
  - TensorRT Runner: GPU-optimized inference with NVIDIA TensorRT acceleration
- **Health Endpoints**: Added `/health`, `/ready`, `/metrics` endpoints to TensorRT Runner
- **Service Documentation**: Updated copilot instructions to clarify parallel ML service architecture

### Changed
- **Copilot Instructions**: Restructured ML inference services section to emphasize parallel CPU/GPU architecture
- **Docker Health Checks**: Updated TensorRT Runner health check to use standard `/health` endpoint
- Changelog documentation system
- Standardized development workflow requirements

### Changed
- Updated development instructions to require changelog maintenance

## [2025-09-29] - Documentation Consistency Fixes

### Fixed
- **Duplicate Entries**: Removed duplicate `docker-compose.production.yml` entries from README.md and PROJECT_STATUS.md tables
- **Port Standardization**: Updated all documentation to use port 8080 for development and port 80 for production
- **File References**: Replaced all references to non-existent `docker-compose.dev-frontend.yml` with `docker-compose.frontend-only.yml`
- **Development Scripts**: Created `docker-compose.dev-fullstack.yml` for dedicated full-stack development with port 8080
- **Service Status**: Cleaned up duplicate entries in PROJECT_STATUS.md service status matrix
- **Development Options**: Consolidated to 3 clear development approaches (Local, Docker Frontend, Full Stack)
- **Port Documentation**: Updated PORT_MAPPING.md to consistently reflect dev=8080, prod=80 policy

### Added
- `docker-compose.dev-fullstack.yml`: New compose file for full-stack development with hot-reload frontend
- Updated `dev-fullstack.sh` to use dedicated development compose file
- Clearer development workflow documentation with 3 main options

### Changed
- Updated README.md to reflect new development approach structure
- Modified port assignments in documentation to match standardized policy

## [2025-09-29] - Major Documentation Consistency Cleanup

### Fixed
- **Documentation Structure**: Removed duplicate DEVELOPMENT.md and PORT_MAPPING.md files from root directory
- **Docker References**: Updated all references from non-existent `docker-compose.dev-frontend.yml` to actual `docker-compose.frontend-only.yml`
- **Script Organization**: Created clear script hierarchy with intuitive naming (dev-frontend.sh, dev-fullstack.sh, production.sh, quick-start.sh)
- **Port Mapping**: Standardized all documentation to consistently reflect Local=5173, Docker=8080, Production=80
- **Service Status**: Replaced conflicting service status reports with comprehensive status matrix
- **Development Workflow**: Updated documentation to provide equal support for local and Docker development with clear use cases

### Removed
- Duplicate documentation files in root directory
- References to non-existent Docker compose files
- Conflicting development workflow recommendations

## [2025-09-28] - Documentation Cleanup & Mock MCP Implementation

### Added
- Complete Mock MCP service implementation (`mock_mcp/app.py`)
- FastAPI-based broker simulation with authentication, holdings, positions, and orders endpoints
- Docker configuration for Mock MCP service (`Dockerfile.mockmcp`)
- Comprehensive Mock MCP documentation (`docs/services/mock_mcp.md`)
- Docker Compose usage guide in main README
- Centralized documentation structure under `docs/`

### Fixed
- README header conflicts and structural inconsistencies
- Docker service configuration conflicts (uncommented mock-mcp service)
- References to non-existent services (`settings`, `settings-api` → `frontend`, `backend`)
- Script reference inconsistencies throughout documentation
- Docker command format standardization (`docker compose` → `docker-compose`)
- Frontend service references in development documentation

### Changed
- Consolidated duplicate documentation files
- Standardized service naming across all documentation
- Updated docker-compose.yml with proper service dependencies
- Reorganized documentation into logical categories

### Removed
- Duplicate `docs/frontend/frontend_readme.md` (consolidated into `frontend/README.md`)
- References to non-existent development scripts
- Conflicting environment variable definitions

---

## Changelog Maintenance Guidelines

### When to Update
- **Every commit** that introduces user-facing changes
- **Before creating pull requests**
- **When adding new features or services**
- **When fixing bugs or resolving issues**
- **When changing configuration or deployment processes**

### Entry Format
```markdown
## [YYYY-MM-DD] - Brief Description

### Added
- New features, files, or capabilities

### Changed
- Modifications to existing functionality

### Fixed
- Bug fixes and issue resolutions

### Removed
- Deleted files, features, or deprecated functionality

### Security
- Security-related changes and fixes
```

### Timestamp Requirements
- Use ISO 8601 date format: `YYYY-MM-DD`
- Include time for critical hotfixes: `YYYY-MM-DD HH:MM UTC`
- Always use UTC timezone for consistency

### Categories
- **Added**: New features, services, documentation
- **Changed**: Modifications to existing functionality
- **Fixed**: Bug fixes, issue resolutions, corrections
- **Removed**: Deleted features, deprecated functionality
- **Security**: Security improvements and vulnerability fixes
- **Deprecated**: Features marked for future removal

### Best Practices
1. Write entries from the user's perspective
2. Be concise but descriptive
3. Include relevant file paths for major changes
4. Link to issues/PRs when applicable
5. Group related changes logically
6. Keep the [Unreleased] section updated during development