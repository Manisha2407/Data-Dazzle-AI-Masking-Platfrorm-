# Data Dazzle

> AI-powered sensitive data redaction and document intelligence platform built using React, Express, Django NLP services, PostgreSQL, Elasticsearch, and Docker.

---

## Overview

Data Dazzle is a full-stack document redaction and analytics platform designed to detect, redact, search, and analyze sensitive information from uploaded documents.

The system combines:

- A modern React frontend
- An Express.js API gateway
- A Django NLP microservice
- PostgreSQL for structured storage
- Elasticsearch + Kibana for indexing and analytics
- Docker Compose for full infrastructure orchestration

The project supports automated detection of:

- Aadhaar numbers
- PAN cards
- Emails
- Phone numbers
- Bank details
- Credit cards
- IP addresses
- URLs
- Locations
- Organizations
- Person names
- And more...

---

# Features

## Document Processing

- Upload TXT, PDF, and DOCX files
- AI-powered sensitive entity detection
- Multiple redaction methods
- Confidence threshold configuration
- Parallel chunk processing pipeline
- Async NLP processing
- Large document support

---

## Search & Analytics

- Elasticsearch-powered search engine
- Entity-level indexing
- Full-text document search
- Processing analytics dashboard
- Risk scoring system
- Confidence analysis
- Entity distribution insights
- Kibana integration

---

## Security & Authentication

- JWT authentication
- Access + refresh token flow
- Automatic token refresh handling
- Protected API routes
- User-specific document isolation
- Auto-delete scheduling system

---

## Infrastructure

- Full Docker containerization
- Multi-service orchestration with Docker Compose
- Persistent PostgreSQL volumes
- Persistent Elasticsearch volumes
- Hot reload development workflow
- Environment-based configuration

---

# Tech Stack

## Frontend

- React
- Vite
- React Router
- CSS

## Backend

### Express Server

- Node.js
- Express.js
- Prisma ORM
- JWT Authentication
- Elasticsearch Client
- Node Cron

### Django NLP Service

- Django
- spaCy
- NLP entity extraction pipeline

## Database & Search

- PostgreSQL
- Elasticsearch 8
- Kibana

## DevOps

- Docker
- Docker Compose

---

# System Architecture

```text
User
  ↓
React Frontend (Vite)
  ↓
Express API Gateway
  ├── PostgreSQL
  ├── Elasticsearch
  ├── Kibana
  └── Django NLP Service
```

---

# Dockerized Setup

The entire project is fully containerized.

After setup, collaborators only need:

```bash
# Clone repository
git clone https://github.com/pr0xiuss/Data-Dazzle.git

# Move into docker directory
cd docker

# Start containers
docker compose up --build

# Run Prisma migrations
docker compose exec express npx prisma migrate dev
```

---

# Environment Variables

## Express `.env.docker`

```env
DATABASE_URL="postgresql://postgres:password@postgres:5432/data_dazzle"

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

PORT=5000

ELASTICSEARCH_URL=http://elasticsearch:9200
DJANGO_URL=http://django:8000
```

---

# Running Services

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Express API | http://localhost:5000 |
| Django NLP | http://localhost:8000 |
| Elasticsearch | http://localhost:9200 |
| Kibana | http://localhost:5601 |

---

# Docker Commands

## Start containers

```bash
docker compose up
```

## Start in background

```bash
docker compose up -d
```

## Rebuild containers

```bash
docker compose up --build
```

## Stop containers

```bash
docker compose stop
```

## Restart containers

```bash
docker compose start
```

## Shutdown stack

```bash
docker compose down
```

## Remove everything including database volumes

```bash
docker compose down -v
```

---

# Elasticsearch Indices

The project automatically manages:

- `datadazzle_documents`
- `datadazzle_entities`
- `datadazzle_audit`

---

# Processing Pipeline

```text
Upload File
    ↓
Express API
    ↓
Django NLP Processing
    ↓
Entity Extraction
    ↓
Redaction
    ↓
Store Metadata in PostgreSQL
    ↓
Index Search Data in Elasticsearch
    ↓
Analytics & Kibana Visualization
```

---

# Performance Optimizations

The project includes:

- Parallel chunk processing
- Async processing pipeline
- Batch Elasticsearch indexing
- Interval-tree based redaction handling
- Optimized entity indexing
- Chunk-level NLP execution

---

# Future Improvements

- AWS EC2 deployment
- S3 file storage integration
- Nginx reverse proxy
- Production-ready frontend builds
- Health checks
- CI/CD pipeline
- Role-based access control

---

# Author

Developed by pr0xius.

---

# License

This project is for educational and portfolio purposes.

