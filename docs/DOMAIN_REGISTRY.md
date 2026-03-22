# Heady Systems Domain Registry

## Primary Domains

| Domain | Purpose | Status | Notes |
|--------|---------|--------|-------|
| `headysystems.com` | Primary corporate domain for HeadySystems Inc. | Active | Used in HCFullPipeline for production deployments |
| `headyconnection.com` | Primary domain for HeadyConnection Inc. (non-profit) | Active | Legal entity separation from C-Corp |

## Development & Deployment Domains

| Domain | Purpose | Platform | Status |
|--------|---------|----------|--------|
| `heady-manager-headyme.onrender.com` | HeadyMe service endpoint | Render.com | Active |
| `heady-manager-headysystems.onrender.com` | HeadySystems service endpoint | Render.com | Active |
| `heady-manager-headyconnection.onrender.com` | HeadyConnection service endpoint | Render.com | Active |

## Code Repository Domains

| Domain | Purpose | Access | Notes |
|--------|---------|--------|-------|
| `github.com/HeadySystems` | Primary C-Corp repositories | Public/Private | Main development org |
| `github.com/HeadyMe` | HeadyMe specific repositories | Public | Sub-org for HeadyMe projects |
| `github.com/HeadySystems/sandbox` | Testing and experimentation | Public | Sandbox repository |

## Local Development Domains

| Domain | Purpose | Environment | Notes |
|--------|---------|-------------|-------|
| `localhost:3300` | Local MCP server | Development | Default port for heady-manager |
| `localhost:*` | Various local services | Development | Dynamic ports for testing |

## Domain Usage Context

### Production Pipeline
- **HCFullPipeline.ps1**: Uses `headysystems.com` as default domain
- **Health Checks**: Verifies production endpoints via domain URLs
- **Deployment**: Targets Render.com subdomains for service deployment

### Development Workflow
- **Local Development**: Uses localhost and port configurations
- **Git Remotes**: Multiple GitHub organizations for different legal entities
- **CI/CD**: Render.com integration for automated deployments

### Legal Separation
- **HeadySystems Inc.** (C-Corp): Commercial operations
- **HeadyConnection Inc.** (Non-Profit): Charitable activities
- **Domain isolation** maintains legal and operational boundaries

## Configuration References

### Environment Variables
```bash
# Cloud Endpoints
CLOUD_HEADYME_URL=https://heady-manager-headyme.onrender.com
CLOUD_HEADYSYSTEMS_URL=https://heady-manager-headysystems.onrender.com
CLOUD_HEADYCONNECTION_URL=https://heady-manager-headyconnection.onrender.com
```

### Git Configuration
```bash
# Remotes
origin: git@github.com:HeadySystems/Heady.git
heady-sys: git@github.com:HeadySystems/Heady.git
heady-me: git@github.com:HeadyMe/Heady.git
sandbox: git@github.com:HeadySystems/sandbox.git
```

## Security Considerations

- **API Keys**: Domain-specific API keys for service authentication
- **CORS**: Configured for allowed domains in production
- **SSL**: All production domains use HTTPS
- **Access Control**: Domain-based access rules for different environments

---
*Generated: 2026-02-07*  
*System: HeadyMonorepo HCFullPipeline*
