# 🚀 Vidhya Praman — Deployment & Operations Guide

This guide covers deployment options for the Vidhya Praman ecosystem across local development, containerized environments, and cloud infrastructure.

---

## 1. Quick Start: Local Multi-Process Launch

### Windows 1-Click Launcher
Run the automated launcher in the repository root:
```cmd
start_all.bat
```
This launches all three services in synchronized CMD windows:
1. **Django Database & Auth**: `http://127.0.0.1:8001`
2. **FastAPI AI/ML Engine**: `http://127.0.0.1:8000`
3. **React Vite UI**: `http://localhost:5173`

---

## 2. Docker Compose Orchestration

Vidhya Praman includes production-ready Dockerfiles under `deploy/` and a top-level `docker-compose.yml`.

### Prerequisites
- Docker Engine $\ge 24.0$
- Docker Compose $\ge 2.20$

### Running with Docker Compose
```bash
# 1. Clone repository
git clone https://github.com/shanmukh-1914/VidhyaPraman.git
cd VidhyaPraman

# 2. Configure environment
cp .env.example .env

# 3. Start services in background
docker compose up -d --build

# 4. Check status
docker compose ps
docker compose logs -f
```

---

## 3. Production Cloud Deployment: AWS Free Tier ($0/month)

A complete, production-tested guide for running Vidhya Praman on an **AWS EC2 Free Tier (`t2.micro` or `t3.micro`)** instance with **100% free resources** is available:

👉 **[Complete AWS Free Tier Deployment Guide](AWS_FREE_TIER_DEPLOYMENT_GUIDE.md)**

### Key Highlights of the AWS Free Tier Setup:
- **Zero Cost Architecture**: Uses `t2.micro` (750 free hours/mo), 30 GB EBS, and local SQLite with Nginx reverse proxy.
- **Overcoming 1 GB RAM**: Automated creation of a **4 GB Linux Swap File** gives the instance 5 GB of virtual memory.
- **CPU-Only PyTorch**: Installs the CPU-only PyTorch binary wheel, avoiding 2.5 GB of unused CUDA binaries.
- **Automated Script**: Run `sudo bash deploy/setup_aws_ec2.sh` for 1-click end-to-end setup.
- **Systemd Daemons**: Auto-healing systemd services for both Django (`vidhyapraman-django.service`) and FastAPI (`vidhyapraman-fastapi.service`).

---

## 4. Environment Variables Reference

Ensure all keys defined in `.env.example` are configured before deploying to production. For production, set:
- `DEBUG=False`
- `ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com`
- `DJANGO_SECRET_KEY` to a securely generated random string (`openssl rand -hex 32`)
- `JWT_SECRET_KEY` to a separate random string
