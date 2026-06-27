# CXSun

<<<<<<< Updated upstream
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
**Version:** 1.0.131
=======
**Version:** 1.0.128
>>>>>>> Stashed changes

CXSun is now kept as a focused billing workspace: one Fastify backend, one React/Vite frontend, one shared utility package, and local CLI helpers.

<<<<<<< Updated upstream
CXSun is intentionally managed as one repo. The current combined backend remains available while the platform moves toward separately deployable backend services. Platform API is the first foundation service, followed by Billing API and other app-owned services.

## 🚀 Overview

The platform is engineered with a modern, multi-tenant architecture to support complex business requirements:

- **Platform Layer:** Global orchestration managing tenants, industries, and system-wide configurations powered by a master MariaDB database.
- **Tenant Layer:** Secure data isolation for each tenant using dedicated MariaDB databases, ensuring privacy and scalability.
- **AI-Native Integration:** Built-in AI assist system designed to accelerate development cycles and provide intelligent operational support.
- **Modern Tech Stack:** Leveraging Fastify for a high-performance backend and React/Vite for a responsive, modern frontend experience.

## 🛠️ Usage

CXSun can be used as a foundation for various business applications:
- **ERP Systems:** Manage enterprise resources, supply chains, and business processes.
- **E-commerce Platforms:** Deploy multi-vendor or multi-store retail solutions.
- **SaaS Products:** Build and scale multi-tenant software services with ease.

---

## 📋 Requirements

- **Node.js:** v20+
- **Package Manager:** npm v10+
- **Databases:**
  - **MariaDB:** For platform-level orchestration and tenant-isolated business databases through `DB_*`.
  - **MariaDB/MySQL:** For tenant-specific business data.
- **Optional:** Redis (caching), Docker (deployment).

## ⚙️ Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/CODEXSUN/cxsun.git
    cd cxsun
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    ```bash
    cp .env.sample .env
    ```
    *Update `.env` with your local database credentials.*

4.  **Launch the platform:**
    ```bash
    npm run dev
    ```

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start server and frontend concurrently |
| `npm run dev:server` | Start Fastify backend in development mode |
| `npm run dev:platform-api` | Start the Platform API foundation service on `PLATFORM_API_PORT` |
| `npm run dev:frontend` | Start React + Vite frontend in development mode |
| `npm run dev:desktop` | Start the Electron desktop shell |
| `npm run dev:docs` | Start the Docusaurus docs app on port 6020 |
| `npm run dev:auditor`, `npm run dev:ecommerce`, etc. | Start one scaffolded product app surface on its assigned port |
| `npm run dev:product-apps` | Start all scaffolded product app shells together |
| `npm run check` | Execute project-wide health checks |
| `npm run build:active` | Compile production builds for apps |
| `npm run build:platform-api` | Compile the Platform API foundation service |
| `npm run build:desktop` | Build the Windows desktop installer in `build/desktop` |
| `npm run e2e:desktop` | Build and smoke-test the Electron desktop shell against `codexsun.local:6005` |
| `npm run build:product-apps` | Compile all scaffolded product app shells |

## 🏗️ Project Structure
=======
## Active Shape
>>>>>>> Stashed changes

```text
cxsun/
├── apps/
│   ├── cli/        # local workflow scripts
│   ├── frontend/   # React + Vite billing UI
│   └── server/     # Fastify backend API
├── packages/
│   └── shared/     # framework-free shared types/utilities
├── assist/         # project rules and working notes
└── storage/        # local runtime storage
```

## Requirements

- Node.js 20+
- npm 10+
- MariaDB/MySQL for platform and tenant databases

## Setup

```bash
npm install
cp .env.sample .env
npm run dev
```

Update `.env` with your local database credentials before starting the server.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start server and frontend together |
| `npm run dev:server` | Start only the backend |
| `npm run dev:frontend` | Start only the frontend |
| `npm run typecheck:active` | Typecheck server, frontend, and shared package |
| `npm run build:active` | Build server and frontend into root `build/` |
| `npm run check` | Run active typechecks and builds |
| `npm run db:migrate` | Run server migrations |
| `npm run db:seed` | Seed server data |
| `npm run db:setup` | Setup database schema and seed data |

## Runtime

- Backend default port: `6005`
- Frontend default port: `6010`
- Frontend API target is read from the server dev-state file during local `npm run dev`, or from `VITE_API_BASE_URL` when set.

## Verification

Before finishing meaningful changes, run:

```bash
npm run check
```
