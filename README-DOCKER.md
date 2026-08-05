# 🐳 Docker Deployment Guide

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo>
cd project-management
```

### 2. Build and start all services

```bash
docker-compose up -d --build
```

### 3. Access the application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Database**: localhost:5432

### 4. Check services status

```bash
docker-compose ps
```

## Available Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild services
```bash
docker-compose up -d --build
```

### Clean everything
```bash
docker-compose down -v --rmi all
```

## Environment Variables

### Backend
- `SPRING_DATASOURCE_URL`: PostgreSQL connection URL
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password
- `JWT_SECRET_KEY`: JWT secret key
- `JWT_EXPIRATION`: JWT token expiration (milliseconds)

### Frontend
- `VITE_API_URL`: Backend API URL

## Production Deployment

### 1. Update environment variables

Create `.env` file:

```env
# Database
POSTGRES_DB=projectydb
POSTGRES_USER=admin
POSTGRES_PASSWORD=secure_password_here

# JWT
JWT_SECRET_KEY=your_secure_secret_key_here
JWT_EXPIRATION=86400000

# API URL
VITE_API_URL=https://your-api-domain.com/api/v1
```

### 2. Update docker-compose.yml

```yaml
services:
  postgres:
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  
  backend:
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      JWT_EXPIRATION: ${JWT_EXPIRATION}
  
  frontend:
    environment:
      VITE_API_URL: ${VITE_API_URL}
```

### 3. Deploy

```bash
docker-compose up -d --build
```

## Troubleshooting

### Backend can't connect to database

Check if PostgreSQL is healthy:
```bash
docker-compose logs postgres
```

### Frontend can't reach backend

Check backend logs:
```bash
docker-compose logs backend
```

Verify CORS configuration in backend.

### Database data persistence

Data is stored in Docker volume `postgres-data`. To backup:

```bash
docker exec projecty-postgres pg_dump -U postgres projectydb > backup.sql
```

To restore:
```bash
docker exec -i projecty-postgres psql -U postgres projectydb < backup.sql
```

## Development vs Production

### Development (current setup)
- Exposes all ports
- Hot reload not enabled (requires volume mounts)
- Uses development environment variables

### Production recommendations
- Use secrets management (Docker Secrets, Kubernetes Secrets)
- Enable HTTPS with reverse proxy (Nginx, Traefik)
- Use production-grade PostgreSQL with backups
- Implement health checks and monitoring
- Use environment-specific configurations
- Enable logging aggregation

## Monitoring

### Check container health
```bash
docker-compose ps
docker stats
```

### View resource usage
```bash
docker stats projecty-backend projecty-frontend projecty-postgres
```

## Scaling

To scale backend:
```bash
docker-compose up -d --scale backend=3
```

Note: You'll need a load balancer (Nginx, HAProxy) for multiple backend instances.

## Support

For issues, check logs:
```bash
docker-compose logs -f
```