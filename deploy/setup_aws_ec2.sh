#!/usr/bin/env bash
# ==============================================================================
# Vidhya Praman - Automated AWS Free Tier EC2 Setup & Deployment Script
# Target OS: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS on t2.micro / t3.micro
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   🌟 Vidhya Praman - AWS Free Tier EC2 Installer   ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Root / Sudo Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run with sudo: sudo bash deploy/setup_aws_ec2.sh${NC}"
  exit 1
fi

APP_DIR="/var/www/vidhyapraman"
CURRENT_USER=${SUDO_USER:-ubuntu}

# ------------------------------------------------------------------------------
# 2. Configure 4GB Swap Space (Essential for Free Tier 1GB RAM)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}>>> [Step 1/8] Configuring 4GB Swap Space for 1GB RAM EC2...${NC}"
if [ $(swapon --show | wc -l) -le 1 ]; then
    echo "Creating 4GB swap file to prevent out-of-memory (OOM) errors..."
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    sysctl vm.swappiness=20
    echo 'vm.swappiness=20' >> /etc/sysctl.conf
    echo -e "${GREEN}✓ 4GB Swap created and activated.${NC}"
else
    echo -e "${GREEN}✓ Swap already active ($(free -h | grep -i swap | awk '{print $2}')).${NC}"
fi

# ------------------------------------------------------------------------------
# 3. System Packages Installation
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}>>> [Step 2/8] Installing System Dependencies (Python, Nginx, OpenCV libs)...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    git \
    curl \
    nginx \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    htop \
    ufw

echo -e "${GREEN}✓ System packages installed.${NC}"

# ------------------------------------------------------------------------------
# 4. Install Node.js 20 LTS (For React Vite Build)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}>>> [Step 3/8] Checking Node.js Environment...${NC}"
if ! command -v node &> /dev/null || [ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]; then
    echo "Installing Node.js 20 LTS via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) & npm $(npm -v) ready.${NC}"

# ------------------------------------------------------------------------------
# 5. Application Directory & Permissions Setup
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}>>> [Step 4/8] Setting Up Application Directory...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

if [ "$SCRIPT_DIR" != "$APP_DIR" ]; then
    echo "Copying application files to $APP_DIR..."
    mkdir -p "$APP_DIR"
    cp -r "$SCRIPT_DIR"/* "$APP_DIR"/
    cp "$SCRIPT_DIR"/.env* "$APP_DIR"/ 2>/dev/null || true
    cp "$SCRIPT_DIR"/.gitignore "$APP_DIR"/ 2>/dev/null || true
fi

if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$APP_DIR/frontend/.env" 2>/dev/null || true
    cp "$APP_DIR/.env" "$APP_DIR/server_django/.env" 2>/dev/null || true
fi

chown -R "$CURRENT_USER:$CURRENT_USER" "$APP_DIR"
echo -e "${GREEN}✓ Files placed in $APP_DIR.${NC}"

# ------------------------------------------------------------------------------
# 6. Python Virtual Environment & CPU-Optimized Dependencies (Python 3.12 via uv)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}>>> [Step 5/8] Setting up Python 3.12 Virtual Environment & AI Models...${NC}"
sudo -u "$CURRENT_USER" bash <<EOF
set -e
cd "$APP_DIR"

# Install uv (fast Python manager that guarantees Python 3.12 compatibility)
if ! command -v uv &> /dev/null && [ ! -f "\$HOME/.local/bin/uv" ]; then
    echo "Installing uv package manager..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="\$HOME/.local/bin:\$PATH"

# Recreate .venv using Python 3.12 (fixes Python 3.14 C-extension compilation errors)
if [ -d ".venv" ]; then
    # Check if existing venv is python 3.14
    if .venv/bin/python3 -c "import sys; exit(0 if sys.version_info < (3, 14) else 1)" 2>/dev/null; then
        echo "Valid Python 3.12/3.11 venv exists."
    else
        echo "Replacing incompatible Python environment with stable Python 3.12..."
        rm -rf .venv
        uv venv --python 3.12 .venv
    fi
else
    uv venv --python 3.12 .venv
fi

source .venv/bin/activate

# Install PyTorch CPU-only wheel via uv (lightning fast, pre-built binary)
echo "Installing CPU-only PyTorch for AWS Free Tier..."
uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install remaining AI, FastAPI, and Django dependencies
echo "Installing Vidhya Praman dependencies via uv..."
uv pip install -r requirements.txt
EOF
echo -e "${GREEN}✓ Python 3.12 environment and AI libraries configured successfully.${NC}"

# ------------------------------------------------------------------------------
# 7. Django Migrations & React Production Build
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}>>> [Step 6/8] Running Database Migrations & Building Frontend...${NC}"
sudo -u "$CURRENT_USER" bash <<EOF
cd "$APP_DIR"
source .venv/bin/activate

# 1. Django SQLite Database
cd server_django
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# 2. Build React Vite SPA
cd "$APP_DIR/frontend"
npm install
npm run build
EOF
echo -e "${GREEN}✓ Database initialized & React production bundle built.${NC}"

# ------------------------------------------------------------------------------
# 8. Configure Systemd Services (Auto-restart on reboot)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}>>> [Step 7/8] Installing & Starting Systemd Services...${NC}"
cp "$APP_DIR/deploy/vidhyapraman-fastapi.service" /etc/systemd/system/
cp "$APP_DIR/deploy/vidhyapraman-django.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable vidhyapraman-fastapi.service
systemctl restart vidhyapraman-fastapi.service

systemctl enable vidhyapraman-django.service
systemctl restart vidhyapraman-django.service

echo -e "${GREEN}✓ FastAPI & Django systemd background services are live.${NC}"

# ------------------------------------------------------------------------------
# 9. Configure Nginx Reverse Proxy
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}>>> [Step 8/8] Configuring Nginx Reverse Proxy...${NC}"
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/vidhyapraman
ln -sf /etc/nginx/sites-available/vidhyapraman /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx

# ------------------------------------------------------------------------------
# 10. Verification & Summary
# ------------------------------------------------------------------------------
sleep 3

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s https://api.ipify.org || echo "YOUR-EC2-PUBLIC-IP")

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}   🎉 Vidhya Praman Successfully Deployed to AWS Free Tier!    ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "Web Application:      ${BLUE}http://${PUBLIC_IP}/${NC}"
echo -e "FastAPI Swagger Docs: ${BLUE}http://${PUBLIC_IP}/fastapi/docs${NC}"
echo -e "Django Admin / Auth:  ${BLUE}http://${PUBLIC_IP}/django/admin/${NC}"
echo -e "System Status Check:  ${BLUE}http://${PUBLIC_IP}/fastapi/health${NC}"
echo -e "----------------------------------------------------------------"
echo -e "Useful Commands on EC2:"
echo -e "  - View FastAPI Logs:   ${YELLOW}sudo journalctl -u vidhyapraman-fastapi -f${NC}"
echo -e "  - View Django Logs:    ${YELLOW}sudo journalctl -u vidhyapraman-django -f${NC}"
echo -e "  - Restart All:         ${YELLOW}sudo systemctl restart vidhyapraman-fastapi vidhyapraman-django nginx${NC}"
echo -e "================================================================\n"
