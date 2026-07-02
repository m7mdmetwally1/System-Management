# System Management API

Multi-tenant SaaS platform with role-based access control and invitation-based authentication.

## Authentication Flow

This system uses invitation-based authentication. Users cannot self-register.

### 1. Create Tenant (SUPER_ADMIN only)
```bash
POST /tenants
{ "name": "Company Name" }
```

### 2. Send Invitation
```bash
POST /auth/send-invite
{
  "email": "user@company.com",
  "tenantId": 1,
  "role": "ADMIN"  // Optional: USER, ADMIN, SUPER_ADMIN (default: USER)
}
```

### 3. Accept Invitation (via email link)
```bash
POST /auth/accept-invite
{
  "token": "token-from-email",
  "password": "SecurePassword123"
}
```

### 4. Login
```bash
POST /auth/login
{
  "email": "user@company.com",
  "password": "SecurePassword123",
  "tenantId": 1
}
```

Response:
```json
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "user": { "id": 1, "email": "...", "role": "ADMIN", "tenantId": 1 }
}
```

## Token Usage

**Access Token**: Include in header `Authorization: Bearer {access_token}` for all protected endpoints.

**Refresh Token**: Use to get new access token
```bash
POST /auth/refresh
{ "refreshToken": "refresh-token" }
```

**Logout**:
```bash
POST /auth/logout
Authorization: Bearer {access_token}
```

## Role Permissions

- **SUPER_ADMIN**: Full access, can manage tenants and send invites
- **ADMIN**: Can manage users within their tenant
- **USER**: Standard user access

## API Documentation

Interactive documentation available at: `http://localhost:3000/api/docs`

OpenAPI spec: `swagger-spec.json` in repository

## Tech Stack

- NestJS (TypeScript)
- PostgreSQL with Prisma ORM
- JWT Authentication
- Nodemailer for emails

## Setup

```bash
npm install
npx prisma migrate dev
npm run start:dev
```
