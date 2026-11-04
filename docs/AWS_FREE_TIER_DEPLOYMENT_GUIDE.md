# 🚀 Complete AWS Free Tier Deployment Guide for Vidhya Praman

This guide provides a comprehensive, step-by-step walkthrough to deploy **Vidhya Praman** (FastAPI AI/ML Engine, Django Auth/Database, and React Vite Frontend) on an **Amazon Web Services (AWS) Free Tier** account with **$0 cost**.

---

## 📋 Table of Contents
1. [AWS Free Tier & Architecture Overview](#1-aws-free-tier--architecture-overview)
2. [Step 1: Launching the EC2 Free Tier Instance](#step-1-launching-the-ec2-free-tier-instance)
3. [Step 2: Connecting to Your EC2 Instance (SSH)](#step-2-connecting-to-your-ec2-instance-ssh)
4. [Step 3: Transferring or Cloning Your Code](#step-3-transferring-or-cloning-your-code)
5. [Step 4: Configuring Environment Variables (`.env`)](#step-4-configuring-environment-variables-env)
6. [Step 5: Executing the 1-Click Automated Setup](#step-5-executing-the-1-click-automated-setup)
7. [Step 6: Updating OAuth Callback URLs (GitHub & Google)](#step-6-updating-oauth-callback-urls-github--google)
8. [Step 7: (Optional) Adding a Custom Domain & Free SSL (HTTPS)](#step-7-optional-adding-a-custom-domain--free-ssl-https)
9. [Maintenance, Monitoring & Useful Commands](#maintenance-monitoring--useful-commands)
10. [Cost Control Checklist ($0 Guarantee)](#cost-control-checklist-0-guarantee)

---

## 1. AWS Free Tier & Architecture Overview

### Why this configuration stays 100% Free:
| Resource | AWS Free Tier Allowance | Vidhya Praman Usage | Cost |
| :--- | :--- | :--- | :--- |
| **EC2 Compute** | 750 hours/month of `t2.micro` or `t3.micro` | 1 single `t2.micro` instance | **$0.00** |
| **EBS Storage** | 30 GB General Purpose SSD (gp3/gp2) | 30 GB allocated for OS + models + SQLite | **$0.00** |
| **Bandwidth** | 100 GB/month outbound data transfer | Web assets + API calls (< 5 GB/month) | **$0.00** |
| **Database** | *Avoid paid RDS!* | SQLite on local EBS volume (`db.sqlite3`) | **$0.00** |
| **Load Balancer** | *Avoid paid ALB!* | Nginx running directly on EC2 | **$0.00** |

### Single-Server Architecture on EC2:
```
                                 [ Internet Users ]
                                         │
                                  Port 80 / 443
                                         ▼
                     ┌───────────────────────────────────────┐
                     │           Nginx Reverse Proxy         │
                     └───────┬───────────────────┬───────────┘
                             │                   │
                     Port 80 │                   │ Proxy Pass
             ┌───────────────┴────────┐          │
             ▼                        ▼          ▼
     [ React Frontend ]          [ FastAPI ]  [ Django Auth ]
    Static built files           Port: 8000   Port: 8001
(/var/www/.../frontend/dist)     (AI Models)  (ORM & Auth)
```

> [!IMPORTANT]
> **Overcoming the 1 GB RAM Limit**: AWS Free Tier EC2 (`t2.micro`) provides 1 GB of physical RAM. Python AI/ML libraries (PyTorch, OpenCV, YOLOv8) can trigger the Linux Out-Of-Memory (OOM) killer without virtual memory. Our automated setup script automatically creates a **4 GB Swap Space** on your 30 GB disk, expanding virtual memory to **5 GB** and uses the **CPU-only PyTorch wheel** to save ~2.5 GB of disk and RAM.

---

## Step 1: Launching the EC2 Free Tier Instance

1. Log into your [AWS Management Console](https://aws.amazon.com/console/).
2. In the top-right header, select your preferred region (e.g., **US East (N. Virginia) `us-east-1`**, **Asia Pacific (Mumbai) `ap-south-1`**, or **Europe (Frankfurt) `eu-central-1`**).
3. In the search bar at the top, type **EC2** and click **EC2**.
4. Click the orange **"Launch instance"** button.

### Configure the Instance:
- **Name and tags**: `vidhyapraman-server`
- **Application and OS Images (Amazon Machine Image)**:
  - Select **Ubuntu**.
  - Choose **Ubuntu Server 24.04 LTS (HVM), SSD Volume Type** (Make sure it says *"Free tier eligible"*).
- **Instance type**:
  - Select **`t2.micro`** (1 vCPU, 1 GiB Memory, Free tier eligible).
  *(Note: In regions where `t3.micro` is the designated free tier default, select `t3.micro`)*.
- **Key pair (login)**:
  - Click **"Create new key pair"**.
  - Key pair name: `vidhyapraman-key`
  - Key pair type: **RSA**
  - Private key file format: **`.pem`** (for OpenSSH / PowerShell / Bash).
  - Click **Create key pair** (this downloads `vidhyapraman-key.pem` to your Downloads folder — **keep this safe!**).
- **Network settings**:
  - Ensure **Auto-assign public IP** is set to **Enable**.
  - Under Firewall (security groups), check:
    - [x] **Allow SSH traffic from Anywhere (0.0.0.0/0)** (Port 22)
    - [x] **Allow HTTP traffic from the internet** (Port 80)
    - [x] **Allow HTTPS traffic from the internet** (Port 443)
- **Configure storage**:
  - Change the storage size from `8 GiB` to **`30 GiB`** (30 GiB is 100% free tier eligible).
  - Volume type: **General purpose SSD (gp3)**.
- **Summary**: Review settings and click the orange **"Launch instance"** button.
- Click **"View all instances"**. Wait 1–2 minutes until the instance state changes to **Running** and status check shows **2/2 checks passed**.
- Copy the **Public IPv4 address** (e.g., `54.210.123.45`).

---

## Step 2: Connecting to Your EC2 Instance (SSH)

### On Windows (PowerShell or Windows Terminal):
1. Open PowerShell and navigate to the folder where your `.pem` key was downloaded:
   ```powershell
   cd C:\Users\<YourUsername>\Downloads
   ```
2. Connect to your instance (replace with your actual IP address):
   ```powershell
   ssh -i .\vidhyapraman-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
   ```
   *(If prompted "Are you sure you want to continue connecting (yes/no)?", type `yes` and hit Enter).*

### On macOS / Linux:
1. Open Terminal, set permissions for the private key, and connect:
   ```bash
   chmod 400 ~/Downloads/vidhyapraman-key.pem
   ssh -i ~/Downloads/vidhyapraman-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
   ```

You are now logged into the remote Ubuntu server!

---

## Step 3: Transferring or Cloning Your Code

Choose **Option A** (Git) or **Option B** (Direct SCP Upload):

### Option A: Clone via Git (Recommended)
If your repository is on GitHub:
```bash
sudo apt update -y && sudo apt install -y git
sudo mkdir -p /var/www/vidhyapraman
sudo chown -R ubuntu:ubuntu /var/www/vidhyapraman
git clone https://github.com/<YOUR_GITHUB_USERNAME>/VidhyaPraman.git /var/www/vidhyapraman
cd /var/www/vidhyapraman
```

### Option B: Upload Directly from Local Windows PC (SCP)
From your local Windows PowerShell (inside the project root folder):
```powershell
scp -i C:\path\to\vidhyapraman-key.pem -r ./* ubuntu@<YOUR-EC2-PUBLIC-IP>:/home/ubuntu/vidhyapraman/
```
Then in the SSH session:
```bash
sudo mkdir -p /var/www/vidhyapraman
sudo cp -r /home/ubuntu/vidhyapraman/* /var/www/vidhyapraman/
sudo chown -R ubuntu:ubuntu /var/www/vidhyapraman
cd /var/www/vidhyapraman
```

---

## Step 4: Configuring Environment Variables (`.env`)

On the EC2 server, configure your production `.env`:
```bash
nano /var/www/vidhyapraman/.env
```

Ensure the following variables are present:
```env
# LLM Inference Keys
GROQ_API_KEY="gsk_your_groq_api_key_here"
GROQ_MODEL="openai/gpt-oss-120b"
OPENAI_API_KEY=""
NVIDIA_API_KEY=""

# Django Configuration
DJANGO_SECRET_KEY="generate-a-secure-random-string-here"

# OAuth Integrations (Can be updated in Step 6)
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```
Press `Ctrl+O`, then `Enter` to save, and `Ctrl+X` to exit nano.

---

## Step 5: Executing the 1-Click Automated Setup

Run the included automated setup script:
```bash
cd /var/www/vidhyapraman
sudo bash deploy/setup_aws_ec2.sh
```

### What the automated script does for you:
1. **Configures 4 GB Swap Space**: Enables seamless execution of PyTorch and YOLO models on the 1 GB instance without out-of-memory crashes.
2. **Installs System Libraries**: Installs Python 3, Node.js 20 LTS, Nginx, and OpenCV graphics libraries.
3. **Optimizes PyTorch**: Installs the lightweight CPU-only PyTorch distribution (saving 2.5 GB of download time and disk).
4. **Builds Frontend**: Runs `npm install` and compiles the React application into production static assets.
5. **Initializes Database**: Executes Django migrations on the SQLite database (`db.sqlite3`).
6. **Creates Systemd Background Services**:
   - `vidhyapraman-fastapi.service` (runs Uvicorn on `127.0.0.1:8000`)
   - `vidhyapraman-django.service` (runs Gunicorn on `127.0.0.1:8001`)
   - Configures automatic restart if the server reboots.
7. **Sets up Nginx**: Configures Nginx to serve the React SPA on port 80 and reverse-proxy `/fastapi/` and `/django/` API traffic.

Once complete, the script will output:
```
================================================================
   🎉 Vidhya Praman Successfully Deployed to AWS Free Tier!    
================================================================
Web Application:      http://<YOUR-EC2-PUBLIC-IP>/
FastAPI Swagger Docs: http://<YOUR-EC2-PUBLIC-IP>/fastapi/docs
Django Admin / Auth:  http://<YOUR-EC2-PUBLIC-IP>/django/admin/
System Status Check:  http://<YOUR-EC2-PUBLIC-IP>/fastapi/health
================================================================
```

Open your browser and navigate to `http://<YOUR-EC2-PUBLIC-IP>/`. Your entire application is now live!

---

## Step 6: Updating OAuth Callback URLs (GitHub & Google)

To allow users to log in with GitHub or Google from your deployed AWS IP:

### 1. GitHub OAuth App Settings:
1. Go to [GitHub Developer Settings](https://github.com/settings/developers) -> **OAuth Apps**.
2. Select your OAuth app.
3. Update:
   - **Homepage URL**: `http://<YOUR-EC2-PUBLIC-IP>/`
   - **Authorization callback URL**: `http://<YOUR-EC2-PUBLIC-IP>/django/api/github/`

### 2. Google Cloud Console Settings:
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your OAuth 2.0 Client ID.
3. Under **Authorized JavaScript origins**, add:
   - `http://<YOUR-EC2-PUBLIC-IP>`
4. Under **Authorized redirect URIs**, add:
   - `http://<YOUR-EC2-PUBLIC-IP>/django/api/google/`
5. Click **Save**.

---

## Step 7: (Optional) Adding a Custom Domain & Free SSL (HTTPS)

Webcams (for Proctoring and Face Biometrics) require **HTTPS** on modern browsers when accessing over a non-localhost network. Getting a free SSL certificate takes 2 minutes:

### 1. Point Your Domain:
Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.) and add an **A Record**:
- **Type**: `A`
- **Host / Name**: `@` (or `app`)
- **Value / Points to**: `<YOUR-EC2-PUBLIC-IP>`

### 2. Install Let's Encrypt Certbot:
In your SSH session:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Generate Free SSL Certificate:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Enter your email and agree to terms. Certbot will automatically configure Nginx with SSL and auto-renewal.

Your site will now be secured with HTTPS at `https://yourdomain.com/`!

---

## Maintenance, Monitoring & Useful Commands

### Check System Status & Resource Usage:
```bash
# View RAM and 4GB Swap memory usage
free -h

# Interactive task manager
htop

# Check disk space
df -h
```

### Service Logs & Control:
```bash
# View live FastAPI AI server logs
sudo journalctl -u vidhyapraman-fastapi -f

# View live Django database logs
sudo journalctl -u vidhyapraman-django -f

# Check status of all services
sudo systemctl status vidhyapraman-fastapi
sudo systemctl status vidhyapraman-django
sudo systemctl status nginx

# Restart all services
sudo systemctl restart vidhyapraman-fastapi vidhyapraman-django nginx
```

### Updating Your Code in the Future:
Whenever you make changes to the codebase and push to GitHub, run this single command on EC2:
```bash
cd /var/www/vidhyapraman
sudo bash deploy/update_app.sh
```
It pulls the latest code, applies migrations, rebuilds the React frontend, and restarts the services with zero downtime.

---

## Cost Control Checklist ($0 Guarantee)

To guarantee you remain within the 100% Free Tier:
- [x] **Keep instance type `t2.micro` or `t3.micro`**: Do NOT upgrade to larger instances (like `t2.medium` or `c5.large`). The 4GB swap space provides all the headroom needed.
- [x] **Keep EBS Volume under 30 GiB**: AWS gives you 30 GB free per month across all EBS volumes.
- [x] **Do NOT create an AWS RDS Database**: We use SQLite (`db.sqlite3`) stored directly on your free EBS volume.
- [x] **Do NOT create an AWS Application Load Balancer (ALB)**: Nginx handles SSL and reverse proxying for free.
- [x] **Set up AWS Billing Alert**:
  1. In the AWS console search bar, type **Billing**.
  2. In the left menu, click **Preferences** / **Budgets**.
  3. Create a budget for `$0.01` to receive an instant email alert if any non-free tier feature is accidentally clicked.
