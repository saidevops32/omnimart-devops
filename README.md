# OmniMart Enterprise Cloud-Native Quick-Commerce Platform

Production-ready polyglot microservices system running on Azure Kubernetes Service (AKS) with zero static database passwords, Azure Entra ID Workload Identity, L7 Path-Based Ingress, and a 7-stage DevSecOps CI/CD compliance gate.

### Architecture Topology:
- `/*` -> React Storefront & Admin Portal (Vite + Nginx)
- `/api/auth/*` -> Node.js 22 + Azure Database for MySQL (Passwordless Entra ID)
- `/api/catalog/*` -> Node.js 22 + Azure Database for PostgreSQL (Passwordless Entra ID)
- `/api/checkout/*` & `/api/cart/*` -> Java 21 Spring Boot 3 + Azure SQL Serverless (Passwordless Entra ID)
- `/ws/tracking/*` -> Erlang/OTP 27 Cowboy (Persistent WebSocket live GPS engine)
- Mobile Client -> Flutter multi-platform application consuming API Gateway endpoints
