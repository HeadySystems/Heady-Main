# HCFP PHASE 2: BACKEND SERVICES DEPLOYMENT
# Prerequisites: Phase 1 (Docker Rebuild) must be complete
# Purpose: Deploy Heady MCP, Database, and Core Backend Services

Write-Host "===========================================" -ForegroundColor Blue
Write-Host "HCFP PHASE 2: BACKEND DEPLOYMENT" -ForegroundColor Blue
Write-Host "Deploying Control Plane and Data Layer" -ForegroundColor Blue
Write-Host "===========================================" -ForegroundColor Blue

# Check Docker Status
Write-Host "`n[1/4] verifying Docker Runtime..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Run Phase 1 first." -ForegroundColor Red
    exit
}
Write-Host "  Docker is healthy." -ForegroundColor Green

# Create Network Infrastructure
Write-Host "`n[2/4] Creating Network Segments..." -ForegroundColor Yellow
$networks = @("heady-platform", "heady-app", "heady-data")
foreach ($net in $networks) {
    if (-not (docker network ls --format '{{.Name}}' | Select-String $net)) {
        docker network create $net
        Write-Host "  Created network: $net" -ForegroundColor Green
    } else {
        Write-Host "  Network exists: $net" -ForegroundColor Gray
    }
}

# Deploy Data Layer (Postgres + Redis)
Write-Host "`n[3/4] Deploying Data Layer..." -ForegroundColor Yellow

# Postgres
Write-Host "  Starting Postgres..." -ForegroundColor Cyan
docker run -d `
    --name heady-postgres `
    --network heady-data `
    --restart always `
    -e POSTGRES_USER=heady `
    -e POSTGRES_PASSWORD=heady_dev_secret `
    -e POSTGRES_DB=heady_core `
    -v heady-pg-data:/var/lib/postgresql/data `
    --cpus="1.0" `
    --memory="1g" `
    postgres:15-alpine

# Redis
Write-Host "  Starting Redis..." -ForegroundColor Cyan
docker run -d `
    --name heady-redis `
    --network heady-data `
    --restart always `
    --cpus="0.5" `
    --memory="512m" `
    redis:7-alpine

# Deploy MCP Control Plane
Write-Host "`n[4/4] Deploying MCP Control Plane..." -ForegroundColor Yellow

# Create dummy MCP image if not exists (for simulation/bootstrapping)
$mcpDockerfile = @"
FROM node:18-alpine
WORKDIR /app
RUN npm init -y && npm install express
COPY . .
CMD ["node", "index.js"]
"@

if (-not (Test-Path "C:\Users\erich\Desktop\HeadyMCP")) {
    New-Item -ItemType Directory -Path "C:\Users\erich\Desktop\HeadyMCP" -Force | Out-Null
    $mcpDockerfile | Set-Content "C:\Users\erich\Desktop\HeadyMCP\Dockerfile"
    
    $mcpIndex = @"
const express = require('express');
const app = express();
app.get('/', (req, res) => res.json({status: 'healthy', role: 'mcp-control-plane'}));
app.listen(3000, () => console.log('MCP listening on 3000'));
"@
    $mcpIndex | Set-Content "C:\Users\erich\Desktop\HeadyMCP\index.js"
    
    Write-Host "  Building bootstrap MCP image..." -ForegroundColor Cyan
    docker build -t heady/mcp-server:latest "C:\Users\erich\Desktop\HeadyMCP"
}

# Run MCP
docker run -d `
    --name heady-mcp `
    --network heady-platform `
    --restart always `
    -p 3000:3000 `
    --cpus="0.5" `
    --memory="512m" `
    heady/mcp-server:latest

# Connect Networks (Routing)
docker network connect heady-data heady-mcp

Write-Host "`n===========================================" -ForegroundColor Green
Write-Host "PHASE 2 COMPLETE: Backend Live" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host "Services Running:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
