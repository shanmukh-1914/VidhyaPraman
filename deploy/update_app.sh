#!/usr/bin/env bash
# ==============================================================================
# Vidhya Praman - Update Script for AWS EC2
# Pulls latest code, rebuilds frontend, runs migrations, restarts services
# ==============================================================================

set -e

APP_DIR="/var/www/vidhyapraman"
CURRENT_USER=${SUDO_USER:-ubuntu}

echo "Updating Vidhya Praman in $APP_DIR..."
cd "$APP_DIR"

# 1. Pull latest code (if git repo)
if [ -d ".git" ]; then
    sudo -u "$CURRENT_USER" git pull origin main || true
fi

# 2. Update Python dependencies if needed
sudo -u "$CURRENT_USER" bash <<EOF
cd "$APP_DIR"
source .venv/bin/activate
pip install -r requirements.txt

# Run migrations
cd server_django
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Build frontend
cd "$APP_DIR/frontend"
npm install
npm run build
EOF

# 3. Restart services
sudo systemctl restart vidhyapraman-fastapi
sudo systemctl restart vidhyapraman-django
sudo systemctl restart nginx

echo "✓ Vidhya Praman successfully updated and restarted!"
