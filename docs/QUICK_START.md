# 🚀 SkillForge AI - Quick Start Guide

This guide will help you get SkillForge AI running on your local machine in just a few minutes.

## 📋 Prerequisites

### Required
- **Docker Desktop** (or Docker Engine + Docker Compose)
- **8GB+ RAM** (recommended)
- **10GB+ free disk space**

### API Keys Needed
- **HuggingFace API Token** (free) - [Get here](https://huggingface.co/settings/tokens)
- **Pinecone API Key** (free tier available) - [Get here](https://app.pinecone.io/)

### Optional (for full features)
- GitHub OAuth App credentials
- LinkedIn OAuth App credentials

## 🔍 Step 1: Check Prerequisites

Run the prerequisites checker to ensure your system is ready:

```bash
./scripts/check-prerequisites.sh
```

This will check:
- ✅ Docker installation and status
- ✅ System requirements (memory, disk space)
- ✅ Required tools availability
- ⚠️ Missing API keys and configuration

## ⚙️ Step 2: Configure Environment

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your API keys:
   ```bash
   # Open in your preferred editor
   nano .env
   # or
   code .env
   # or
   vim .env
   ```

3. **Required changes in `.env`:**
   ```env
   # Replace with your actual HuggingFace token
   HUGGINGFACE_API_TOKEN=hf_your_actual_token_here
   
   # Replace with your actual Pinecone credentials
   PINECONE_API_KEY=your_actual_pinecone_key
   PINECONE_ENVIRONMENT=your_pinecone_environment
   ```

4. **Optional OAuth setup** (for social login):
   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   ```

## 🚀 Step 3: Start Services

Run the minimal setup (recommended for first-time setup):

```bash
docker-compose -f docker-compose.minimal.yml up -d
```

This will:
1. 🔄 Pull and build Docker images
2. 🗄️ Start all database services (PostgreSQL, MongoDB, Redis)
3. 🚀 Launch application services (Frontend, Backend, AI Services)
4. ⏳ Wait for all services to be healthy

**Alternative: Full setup with monitoring (if you need Celery/MinIO):**
```bash
./scripts/setup-dev.sh
```

## ✅ Step 4: Verify Everything Works

Run the comprehensive test suite:

```bash
./scripts/test-minimal-setup.sh
```

This will test:
- 🐳 Docker services status
- 🗄️ Database connectivity
- 🌐 API endpoint responses
- ⚡ Performance checks
- 📝 Service logs for errors

**Expected output:**
```
🎉 SUCCESS! SkillForge AI is Running!

🌐 Access Your Application:
   Frontend:        http://localhost:3000
   Backend API:     http://localhost:8000
   API Docs:        http://localhost:8000/docs
   AI Services:     http://localhost:8001
   AI Docs:         http://localhost:8001/docs

🗄️  Database Connections:
   PostgreSQL:      localhost:5432
   MongoDB:         localhost:27017
   Redis:           localhost:6379
```

## 🌐 Step 5: Access the Application

Once all tests pass, you can access:

### Main Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Development Tools
- **Celery Monitor**: http://localhost:5555 (admin/skillforge_flower_pass)
- **MinIO Console**: http://localhost:9001 (skillforge_minio_user/skillforge_minio_pass)

## 🔧 Common Issues & Solutions

### Issue: Docker services won't start
```bash
# Check Docker is running
docker info

# Check for port conflicts
docker-compose ps
netstat -tulpn | grep :3000

# Restart Docker Desktop
# Then try again: ./scripts/setup-dev.sh
```

### Issue: API keys not working
```bash
# Verify your .env file
cat .env | grep -E "(HUGGINGFACE|PINECONE)"

# Test HuggingFace token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://huggingface.co/api/whoami
```

### Issue: Services are slow to start
```bash
# Check system resources
docker stats

# View service logs
docker-compose logs backend
docker-compose logs ai-services

# Increase Docker memory allocation in Docker Desktop settings
```

### Issue: Database connection errors
```bash
# Check database status
docker-compose ps postgres mongo redis

# Restart databases
docker-compose restart postgres mongo redis

# Wait for health checks
./scripts/test-services.sh
```

## 📊 Development Workflow

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ai-services
```

### Restart Services
```bash
# Restart specific service
docker-compose restart backend

# Restart all services
docker-compose restart

# Rebuild and restart
docker-compose build backend
docker-compose up -d backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Access Service Shells
```bash
# Backend shell
docker-compose exec backend bash

# Frontend shell
docker-compose exec frontend sh

# Database shells
docker-compose exec postgres psql -U skillforge_user -d skillforge_db
docker-compose exec mongo mongosh
docker-compose exec redis redis-cli
```

## 🧪 Testing the AI Features

Once everything is running, you can test the AI capabilities:

### 1. Test Backend API
```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

### 2. Test AI Services
```bash
# Health check
curl http://localhost:8001/health

# Test model loading (once endpoints are implemented)
curl -X POST http://localhost:8001/api/v1/chat/test \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello, AI coach!"}'
```

### 3. Test Frontend
- Open http://localhost:3000
- Check for any console errors in browser dev tools
- Verify the UI loads correctly

## 📚 Next Steps

After successful setup:

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Check the Frontend**: Visit http://localhost:3000
3. **Monitor Services**: Visit http://localhost:5555
4. **Review Logs**: Use `docker-compose logs -f`
5. **Start Development**: Begin implementing features according to the Plan.md

## 🆘 Getting Help

If you encounter issues:

1. **Check Prerequisites**: Run `./scripts/check-prerequisites.sh`
2. **Test Services**: Run `./scripts/test-services.sh`
3. **View Logs**: Use `docker-compose logs [service-name]`
4. **Check Documentation**: Review the README files in each service directory
5. **Reset Environment**: 
   ```bash
   docker-compose down -v
   docker system prune -f
   ./scripts/setup-dev.sh
   ```

## 🎯 Success Indicators

You'll know everything is working when:

- ✅ All services show "healthy" status
- ✅ Frontend loads at http://localhost:3000
- ✅ API docs accessible at http://localhost:8000/docs
- ✅ No critical errors in logs
- ✅ Test script passes all checks

**Happy coding! 🚀**
