<div align="center">

# 🚀 Nexora Backend.

**Enterprise-grade expense sharing & trip planning API**

[![NestJS](https://img.shields.io/badge/NestJS-v10-E0234E?style=flat&logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Biome](https://img.shields.io/badge/Biome-Lint%20%26%20Format-60A5FA?style=flat)](https://biomejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis)](https://redis.io)
[![License](https://img.shields.io/badge/License-UNLICENSED-lightgrey?style=flat)](LICENSE)

</div>

---

## 📖 Tổng quan

Nexora Backend là một REST API được xây dựng theo kiến trúc **Modular Monolith** với khả năng tách thành microservices theo từng giai đoạn phát triển. Hệ thống phục vụ bài toán quản lý chi tiêu nhóm, lên kế hoạch du lịch, và tích hợp AI để tư vấn tài chính.

### ✨ Tính năng chính

| Module | Mô tả |
|---|---|
| **Auth** | Đăng ký, đăng nhập, JWT refresh token rotation, Google OAuth2 |
| **Users** | Quản lý hồ sơ người dùng |
| **Groups** | Tạo và quản lý nhóm chi tiêu, phân quyền Owner/Admin/Member |
| **Expenses** | Ghi chi phí, tách bill (equal / exact / percentage / shares) |
| **Settlements** | Thanh toán nợ giữa các thành viên |
| **Notifications** | Thông báo realtime + hàng đợi |
| **Polls** | Bình chọn trong nhóm |
| **Itinerary** | Lập lịch trình du lịch, hỗ trợ sinh lịch tự động bằng AI |
| **Recommendations** | Phân tích ngân sách và gợi ý tiết kiệm bằng AI |
| **AI Chat** | Trợ lý AI hỗ trợ quản lý chi tiêu và lên kế hoạch |

---

## 🏗️ Kiến trúc

```
src/
├── main.ts                         # Bootstrap, Helmet, CORS, Versioning, Swagger
├── app.module.ts                   # Root module
│
├── modules/                        # Feature modules (business domains)
│   ├── auth/                       # Flat structure (small)
│   ├── users/                      # Flat structure (small)
│   ├── groups/                     # Layered: domain / application / infrastructure / presentation
│   ├── expenses/                   # Layered + domain logic (ExpenseSplitter)
│   ├── settlements/                # Flat + event emission
│   ├── notifications/              # Event-driven, BullMQ processor
│   ├── polls/                      # Flat (small)
│   ├── itinerary/                  # AI queue integration
│   ├── recommendations/            # AI-backed, queue-triggered
│   └── ai/                         # Subdomain structure (large)
│       ├── chat/                   #   Conversational AI + streaming
│       ├── memory/                 #   Persistent conversation memory
│       ├── planning/               #   AI itinerary generation
│       ├── recommendation/         #   Budget analysis
│       └── orchestration/          #   BullMQ AI job processor
│
└── shared/                         # Infrastructure only (no business logic)
    ├── common/                     # Result<T>, Money VO, DomainErrors, Pagination
    │   ├── decorators/             # @CurrentUser, @Public, @RequirePermissions
    │   ├── filters/                # GlobalExceptionFilter
    │   ├── guards/                 # JwtAuthGuard, PermissionsGuard
    │   └── interceptors/           # ResponseInterceptor, CorrelationIdInterceptor
    ├── config/                     # Typed config namespaces
    ├── database/                   # PrismaService (global)
    ├── infrastructure/
    │   ├── ports/                  # AiPort, StoragePort, MapsPort (abstractions)
    │   ├── adapters/               # OpenAiAdapter, AwsS3Adapter (implementations)
    │   └── cache/                  # CacheService, Redis cache-aside pattern
    ├── queue/                      # BullMQ global setup + job constants
    ├── realtime/                   # Socket.IO gateway + RealtimeService
    └── observability/              # Winston logging, health checks, audit trail
```

### Nguyên tắc thiết kế

- **Hexagonal Architecture** — Business logic không phụ thuộc vào framework hay infrastructure
- **Ports & Adapters** — AI, Storage, Maps được truy cập qua interface, dễ thay thế provider
- **Domain Events** — Giao tiếp cross-module qua EventEmitter2 (không gọi service trực tiếp)
- **Complexity-based structure** — Small=flat, Medium=layered, Large=subdomains
- **CQRS-ready** — Có thể tách read/write khi cần mà không cần refactor lớn

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Framework | NestJS 10, TypeScript 5 |
| Database | PostgreSQL 16, Prisma ORM |
| Cache | Redis 7 |
| Queue | BullMQ |
| Realtime | Socket.IO |
| Auth | JWT, Passport, Google OAuth2 |
| AI | OpenAI GPT-4 |
| Storage | AWS S3 |
| Logging | Winston, winston-daily-rotate-file |
| Validation | class-validator, class-transformer, Zod (env fail-fast) |
| Lint/Format | Biome |
| Git Hooks | Lefthook |
| CI/CD | GitHub Actions |
| Docs | Swagger / OpenAPI |

---

## ⚙️ Yêu cầu hệ thống

- **Node.js** 22 LTS (khuyến nghị, đồng bộ với CI/Docker)
- **npm** ≥ 10
- **Docker & Docker Compose** (khuyến nghị cho local dev)
- **PostgreSQL** 16 (hoặc dùng Docker)
- **Redis** 7 (hoặc dùng Docker)

---

## 🚀 Hướng dẫn chạy

### 1. Clone và cài đặt dependencies

```bash
git clone <repo-url>
cd nexora-be
npm install
```

`npm install` sẽ tự chạy `prepare` để cài Lefthook hook scripts.

### 2. Cấu hình biến môi trường

```bash
cp .env.example .env
```

Mở file `.env` và điền các giá trị cần thiết:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/nexora_dev?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (bắt buộc, dùng cho env validation)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Google OAuth2 (tùy chọn)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI (tùy chọn, cần cho tính năng AI)
OPENAI_API_KEY=sk-...

# AWS S3 (tùy chọn, cần cho upload file)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=nexora-uploads
```

Biến môi trường được validate ở startup bằng Zod. Thiếu hoặc sai định dạng các biến bắt buộc sẽ làm app dừng ngay (fail-fast):

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 3. Khởi động với Docker Compose (khuyến nghị)

Cách nhanh nhất để chạy toàn bộ stack:

```bash
# Khởi động PostgreSQL + Redis
docker compose up -d postgres redis

# Chạy migration database
npm run db:migrate

# Seed dữ liệu mặc định (categories)
npm run db:seed

# Chạy API ở chế độ development
npm run start:dev
```

### 4. Chạy thủ công (không dùng Docker)

Đảm bảo PostgreSQL và Redis đã chạy sẵn, sau đó:

```bash
# Generate Prisma client
npm run db:generate

# Chạy migration
npm run db:migrate

# Seed dữ liệu
npm run db:seed

# Khởi động dev server
npm run start:dev
```

### 5. Truy cập API

| Endpoint | URL |
|---|---|
| API Base | http://localhost:3000/api |
| Swagger Docs | http://localhost:3000/docs |
| Health Check | http://localhost:3000/api/health |
| Liveness | http://localhost:3000/api/health/live |
| Readiness | http://localhost:3000/api/health/ready |

---

## 📦 Các lệnh thường dùng

```bash
# Development
npm run dev                # Chạy với hot-reload
npm run start:dev          # Alias của dev
npm run start:debug        # Chạy với debug mode

# Build & Production
npm run build              # Build TypeScript → dist/
npm run start:prod         # Chạy production build

# Database
npm run db:generate        # Regenerate Prisma client sau khi sửa schema
npm run db:migrate         # Tạo và apply migration mới
npm run db:migrate:prod    # Apply migration trong production (không tạo file mới)
npm run db:seed            # Seed dữ liệu mặc định
npm run db:studio          # Mở Prisma Studio (GUI quản lý DB)
npm run db:reset           # Reset toàn bộ database (⚠️ xóa hết data)

# Testing
npm run test               # Chạy unit tests
npm run test:watch         # Unit tests với watch mode
npm run test:cov           # Test với coverage report
npm run test:e2e           # End-to-end tests

# Code quality
npm run lint               # Biome lint
npm run format             # Biome format --write
npm run check              # Biome check (lint + format + imports)
```

---

## ✅ Code Quality Workflow

### Biome (single source of truth)

Project dùng **Biome** làm formatter + linter duy nhất (không dùng ESLint/Prettier).

File cấu hình: `biome.json`

### Lefthook

File cấu hình: `lefthook.yml`

- `pre-commit`: `npx biome check --write .`
- `pre-push`: `npm run build`

Nếu build fail ở `pre-push`, git push sẽ bị chặn.

### TypeScript strict mode

`tsconfig.json` đã bật strict mode và các rule production-grade như:

- `strict`
- `noUncheckedIndexedAccess`
- `noImplicitReturns`
- `noImplicitOverride`
- `forceConsistentCasingInFileNames`

---

## 🔄 CI Pipeline (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

Trigger:

- `push`
- `pull_request`

Các bước chạy tự động:

1. `npm ci`
2. `npx biome check .`
3. `npm run build`
4. `npm run test -- --runInBand`
5. `docker build -t nexora-be:ci .`

Bất kỳ bước nào fail sẽ fail toàn bộ pipeline.

---

## 🔌 WebSocket Events

Kết nối tới `ws://localhost:3000/ws`

### Client → Server

| Event | Payload | Mô tả |
|---|---|---|
| `join-group` | `{ groupId: string }` | Đăng ký nhận events của nhóm |
| `leave-group` | `{ groupId: string }` | Hủy đăng ký |

### Server → Client

| Event | Mô tả |
|---|---|
| `expense.created` | Chi phí mới được tạo trong nhóm |
| `settlement.completed` | Thanh toán được xác nhận |
| `notification` | Thông báo cá nhân |
| `ai.response.chunk` | Chunk streaming từ AI |
| `ai.response.done` | AI response hoàn thành |
| `recommendation.ready` | Gợi ý AI đã sẵn sàng |
| `itinerary.ready` | Lịch trình AI đã được tạo |

---

## 🔐 Xác thực

API sử dụng **JWT Bearer Token**. Thêm header vào mỗi request:

```
Authorization: Bearer <access_token>
```

### Flow đăng nhập

```
POST /api/v1/auth/register     # Đăng ký tài khoản
POST /api/v1/auth/login        # Đăng nhập → trả về accessToken + refreshToken
POST /api/v1/auth/refresh      # Làm mới accessToken (token rotation)
POST /api/v1/auth/logout       # Đăng xuất (revoke tất cả tokens)

GET  /api/v1/auth/google       # Bắt đầu Google OAuth2
GET  /api/v1/auth/google/callback  # Callback Google OAuth2
```

---

## 🌐 API Versioning

Tất cả endpoints đều có prefix version:

```
/api/v1/auth/...
/api/v1/users/...
/api/v1/groups/...
/api/v1/expenses/...
```

---

## 🐳 Docker

### Chỉ chạy infrastructure (DB + Redis)

```bash
docker compose up -d postgres redis
```

### Chạy toàn bộ stack bao gồm API

```bash
docker compose up -d
```

### Build production image

```bash
docker build -t nexora-be:latest .
docker run -p 3000:3000 --env-file .env nexora-be:latest
```

Dockerfile sử dụng **multi-stage build** để:

- tách build-time dependencies và runtime image
- giảm kích thước image
- chạy process bằng non-root user
- hỗ trợ healthcheck endpoint

---

## 🔄 Chiến lược phát triển

Kiến trúc được thiết kế để phát triển tuần tự:

```
Stage 1: Modular Monolith (hiện tại)
    ↓
Stage 2: Feature Modules với domain events
    ↓
Stage 3: Event-driven async workflows
    ↓
Stage 4: Independent deployable modules
    ↓
Stage 5: Microservices (khi cần scale tổ chức)
```

---

## 📁 Cấu trúc thư mục đầy đủ

```
nexora-be/
├── .github/
│   └── workflows/
│       └── ci.yml            # CI: biome, build, test, docker build
├── biome.json                # Biome formatter/linter config
├── lefthook.yml              # Git hooks: pre-commit/pre-push
├── src/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── test/                      # E2E tests
├── dist/                      # Build output (gitignored)
├── logs/                      # Application logs (gitignored)
├── .env.example               # Template biến môi trường
├── .env                       # Biến môi trường (gitignored)
├── docker-compose.yml         # Docker Compose config
├── Dockerfile                 # Multi-stage production build
├── .dockerignore
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

---

## 🤝 Đóng góp

1. Tạo branch từ `develop`: `git checkout -b feature/your-feature`
2. Commit theo convention: `feat: add expense splitting by shares`
3. Tạo Pull Request vào `develop`

**Commit convention:** `feat` | `fix` | `refactor` | `docs` | `test` | `chore`
