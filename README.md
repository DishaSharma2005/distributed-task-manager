# ⚡ Distributed Task Manager

A cloud-native task management application built to demonstrate **horizontal scaling**, **Docker containerisation**, and **AWS load balancing** — deployed across two EC2 instances behind an AWS Application Load Balancer (ALB).

---

## Overview

This project is a simple but complete web application where users can create, complete, and delete tasks. The application itself is intentionally straightforward — the real purpose is to show how the **same Docker image** can run on **multiple EC2 instances** simultaneously, with an **AWS ALB** distributing traffic between them, and both instances reading/writing to the **same MongoDB Atlas database**.

---

## Key Features

| Feature | Detail |
|---|---|
| Task Management | Create, view, complete, and delete tasks |
| Dockerised | Production-ready multi-stage Dockerfile |
| Two EC2 Instances | Same image, different `INSTANCE_ID` env var |
| AWS Application Load Balancer | Distributes HTTP traffic across instances |
| MongoDB Atlas | Shared cloud database — both instances use the same data |
| GitHub Actions CI/CD | Auto-tests, builds, pushes to GHCR, deploys to both EC2s |
| Automated Tests | 10 tests with Jest + Supertest + in-memory MongoDB |
| Health Check Endpoint | `GET /health` — used by ALB to verify instance is alive |
| Instance Identification | `GET /api/instance` — shows which server handled the request |

---

## Architecture

```mermaid
graph TD
    U([🌐 User / Browser]) --> ALB

    ALB["⚖️ AWS Application Load Balancer\nPort 80 — public DNS"]

    ALB --> EC2_1
    ALB --> EC2_2

    EC2_1["🐳 EC2 Instance 1\nDocker: Node/Express\nINSTANCE_ID=EC2-INSTANCE-1\nPort 3000"]
    EC2_2["🐳 EC2 Instance 2\nDocker: Node/Express\nINSTANCE_ID=EC2-INSTANCE-2\nPort 3000"]

    EC2_1 --> DB
    EC2_2 --> DB

    DB[("🍃 MongoDB Atlas\nShared Database")]

    GH([GitHub Repository]) --> GA
    GA[GitHub Actions CI/CD] --> GHCR
    GA -->|SSH Deploy| EC2_1
    GA -->|SSH Deploy| EC2_2
    GHCR[GitHub Container Registry] --> EC2_1
    GHCR --> EC2_2
```

---

## Why Multiple Instances?

Running **two copies of the same application** is called **horizontal scaling**. There are two main benefits:

1. **High Availability** — if one instance crashes or needs maintenance, the other keeps serving users. No single point of failure.
2. **Load Distribution** — with many concurrent users, the ALB splits the traffic so neither server is overwhelmed.

In production systems (Netflix, Amazon, etc.) this pattern scales to hundreds of instances automatically.

---

## How Load Balancing Works

1. A user opens the ALB's public DNS URL in their browser.
2. The ALB receives the HTTP request.
3. The ALB checks its target group — it knows which EC2 instances are **healthy** (via the `/health` endpoint).
4. The ALB forwards the request to one of the healthy instances using a **round-robin** algorithm.
5. The chosen EC2 instance processes the request and responds.
6. The next request may go to the *other* instance.

> **Important:** The application does not control which instance handles a request. That decision belongs entirely to the ALB. Because of connection keep-alive and browser caching, requests may not alternate perfectly between instances — this is normal and expected behaviour.

---

## Project Structure

```
distributed-task-manager/
│
├── src/
│   ├── controllers/
│   │   ├── taskController.js     # CRUD logic for tasks
│   │   └── instanceController.js # Returns INSTANCE_ID
│   ├── models/
│   │   └── Task.js               # Mongoose schema
│   ├── routes/
│   │   ├── taskRoutes.js
│   │   └── instanceRoutes.js
│   ├── app.js                    # Express app + middleware
│   └── server.js                 # DB connect + HTTP listen
│
├── public/
│   ├── index.html                # Single-page frontend
│   ├── style.css                 # Dark-mode UI
│   └── app.js                    # Vanilla JS fetch calls
│
├── tests/
│   ├── setup.js                  # In-memory MongoDB for tests
│   └── app.test.js               # 10 automated tests
│
├── scripts/
│   └── deploy.sh                 # EC2 deployment script
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # GitHub Actions pipeline
│
├── Dockerfile                    # Multi-stage production image
├── docker-compose.yml            # Local dev with MongoDB
├── .dockerignore
├── .env.example                  # Template — copy to .env
├── .gitignore
└── package.json
```

---

## Local Setup (without Docker)

**Requirements:** Node.js 20+, MongoDB running locally or a MongoDB Atlas URI.

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env — set MONGODB_URI to your local MongoDB or Atlas URI

# 4. Start the development server
npm run dev

# 5. Open in browser
# http://localhost:3000
```

---

## Docker Setup (recommended for demos)

**Requirement:** Docker Desktop installed.

```bash
# Option A — Docker Compose (includes a local MongoDB automatically)
docker compose up --build

# Open: http://localhost:3000

# Option B — Docker only (needs an external MongoDB URI in .env)
docker build -t task-manager .
docker run -p 3000:3000 \
  -e INSTANCE_ID=LOCAL \
  -e MONGODB_URI=your_mongodb_uri \
  task-manager
```

---

## Running Tests

Tests use an **in-memory MongoDB** — no external database is needed.

```bash
npm test
```

Expected output: **10 tests passing** across health check, instance info, and full CRUD with edge cases.

---

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | No | Port the server listens on | `3000` |
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/taskmanager` |
| `INSTANCE_ID` | No | Identifies this server instance | `EC2-INSTANCE-1` |

---

## API Documentation

### Health & Instance

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/health` | ALB health check | `{ "status": "healthy", "instance": "...", "timestamp": "..." }` |
| `GET` | `/api/instance` | Which server responded | `{ "instance": "EC2-INSTANCE-1", "hostname": "..." }` |

### Tasks

| Method | Endpoint | Description | Body |
|---|---|---|---|
| `GET` | `/api/tasks` | Get all tasks | — |
| `POST` | `/api/tasks` | Create a task | `{ "title": "...", "description": "..." }` |
| `PUT` | `/api/tasks/:id` | Update a task | `{ "completed": true }` |
| `DELETE` | `/api/tasks/:id` | Delete a task | — |

---

## MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Create a free account**
2. Create a **Free Tier (M0) cluster**
3. **Database Access** → Add a database user with a username and password
4. **Network Access** → Add IP address `0.0.0.0/0` (allow from anywhere) for EC2 access
5. **Connect** → Choose *Connect your application* → Copy the connection string
6. Replace `<password>` in the string with your actual password
7. Store the full string as `MONGODB_URI` in your GitHub Secret and in `.env` on each EC2

---

## AWS Deployment — Step by Step

### Part 1 — Create Two EC2 Instances

1. Open **AWS Console** → **EC2** → **Launch Instance**
2. Choose **Amazon Linux 2023** AMI (free tier eligible)
3. Choose **t2.micro** (free tier)
4. **Key pair** → Create a new key pair → Download the `.pem` file
5. **Network Settings** → Create a security group:
   - Inbound: **SSH** port 22 from **My IP**
   - Inbound: **Custom TCP** port 3000 from **anywhere** (we will restrict this later)
6. Launch the instance
7. **Repeat steps 1–6** to create a second EC2 instance (same key pair is fine)

### Part 2 — Install Docker on Each EC2

SSH into each instance:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

Then run:

```bash
# Update packages
sudo dnf update -y

# Install Docker
sudo dnf install docker -y

# Start Docker and enable on boot
sudo systemctl start docker
sudo systemctl enable docker

# Allow ec2-user to run Docker without sudo
sudo usermod -aG docker ec2-user

# Log out and log back in for the group change to take effect
exit
```

### Part 3 — Run the Application on Each Instance

**On EC2 Instance 1:**

```bash
# Pull the image (replace with your actual image name)
docker pull ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO:latest

# Run the container with INSTANCE_ID=EC2-INSTANCE-1
docker run -d \
  --name task-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -e PORT=3000 \
  -e INSTANCE_ID=EC2-INSTANCE-1 \
  -e MONGODB_URI="your_mongodb_atlas_uri" \
  ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO:latest

# Verify it is running
curl http://localhost:3000/health
```

**On EC2 Instance 2** — same command but with `INSTANCE_ID=EC2-INSTANCE-2`:

```bash
docker run -d \
  --name task-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -e PORT=3000 \
  -e INSTANCE_ID=EC2-INSTANCE-2 \
  -e MONGODB_URI="your_mongodb_atlas_uri" \
  ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO:latest
```

### Part 4 — Create an AWS Target Group

1. **EC2** → **Target Groups** → **Create target group**
2. Target type: **Instances**
3. Protocol: **HTTP**, Port: **3000**
4. VPC: choose the same VPC your EC2 instances are in
5. **Health checks**:
   - Protocol: HTTP
   - Path: `/health`
   - Healthy threshold: 2
   - Interval: 30 seconds
6. Click **Next** → Select both EC2 instances → **Include as pending below** → **Create**

### Part 5 — Create an Application Load Balancer

1. **EC2** → **Load Balancers** → **Create Load Balancer** → **Application Load Balancer**
2. Name: `task-manager-alb`
3. Scheme: **Internet-facing**
4. IP type: IPv4
5. **Network mapping**: select at least 2 Availability Zones (required by ALB)
6. **Security Group** for the ALB:
   - Create a new security group named `alb-sg`
   - Inbound: **HTTP** port 80 from `0.0.0.0/0`
7. **Listeners**: HTTP : 80 → Forward to your target group
8. Click **Create load balancer**

### Part 6 — Update EC2 Security Groups

Now restrict the EC2 instances so they only accept traffic from the ALB (not from the public internet on port 3000):

1. **EC2** → **Security Groups** → select the EC2 security group
2. **Edit inbound rules**:
   - Remove the port 3000 rule that allows `0.0.0.0/0`
   - Add: Custom TCP, Port 3000, Source = **alb-sg** (the ALB security group)
3. Keep SSH (port 22) from your IP only

### Part 7 — Verify Deployment

1. Go to **EC2** → **Load Balancers** → click your ALB
2. Copy the **DNS name** (looks like `task-manager-alb-123456789.us-east-1.elb.amazonaws.com`)
3. Open it in your browser
4. You should see the Distributed Task Manager UI

---

## Security Group Summary

| Resource | Protocol | Port | Source |
|---|---|---|---|
| ALB | HTTP | 80 | `0.0.0.0/0` (public internet) |
| EC2 instances | TCP | 3000 | ALB security group only |
| EC2 instances | SSH | 22 | Your IP address only |

---

## GitHub Actions / CI-CD

After every push to `main`:

1. **Test job** — installs dependencies and runs `npm test` with in-memory MongoDB
2. **Build & Push job** (only if tests pass) — builds the Docker image and pushes it to GitHub Container Registry (GHCR) with tags `latest` and `sha-<commit>`
3. **Deploy Instance 1 job** — SSHes into EC2 #1, pulls the new image, restarts the container
4. **Deploy Instance 2 job** — same for EC2 #2

If tests fail → the pipeline stops. No image is pushed and no deployment happens.

### Required GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Description |
|---|---|
| `EC2_HOST_1` | Public IP address of EC2 Instance 1 |
| `EC2_HOST_2` | Public IP address of EC2 Instance 2 |
| `EC2_USER` | SSH username (usually `ec2-user` for Amazon Linux) |
| `EC2_SSH_KEY` | Contents of your EC2 private key `.pem` file |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GHCR_USERNAME` | Your GitHub username |
| `GHCR_TOKEN` | A GitHub Personal Access Token with `read:packages` scope |

> `GITHUB_TOKEN` is automatically provided by GitHub Actions — you do not need to add it manually.

---

## Demo Instructions (2–3 Minutes)

### What to show and say:

**Step 1 — Open the application (30 seconds)**
> "This is the Distributed Task Manager running behind an AWS Application Load Balancer. Notice the 'Current Server' field — it says EC2-INSTANCE-1. This means the ALB routed my request to the first server."

**Step 2 — Show load balancing (45 seconds)**
> "If I open a new browser tab and go to `[ALB URL]/api/instance` I can see the raw JSON. Refreshing may show EC2-INSTANCE-2, proving that a different server handled that request. Both servers are running the exact same Docker image — only the INSTANCE_ID environment variable is different."

**Step 3 — Create a task (30 seconds)**
> "Let me create a task while connected to Instance 1."
— Type a task title and submit.

**Step 4 — Show shared database (30 seconds)**
> "Now I'll keep refreshing until the Server shows EC2-INSTANCE-2. The task I just created is still visible — because BOTH instances connect to the SAME MongoDB Atlas database. The data is not tied to any single server."

**Step 5 — Show GitHub Actions (30 seconds)**
> "The CI/CD pipeline in GitHub Actions automatically runs tests, builds a Docker image, pushes it to GitHub Container Registry, and deploys it to both EC2 instances — without any manual steps."

---

## Architecture Summary (for speaking in class)

> "I built a simple task management app using Node.js and Express. The interesting part is the deployment. The application runs as a Docker container on two separate AWS EC2 virtual machines. In front of them, an AWS Application Load Balancer receives all user requests and distributes them between the two instances. Both instances use the same MongoDB Atlas database in the cloud, so data is always consistent regardless of which server responds. A GitHub Actions pipeline automatically runs tests whenever I push code — if they pass, it builds a new Docker image, pushes it to GitHub Container Registry, and deploys it to both EC2 instances over SSH. This is the same pattern used by real production systems to achieve high availability and horizontal scaling."
