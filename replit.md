# RH System - Gestão de Folha de Ponto

## Overview

This is an HR Time Management System (Sistema de Gestão e Espelho de Ponto) built for processing AFD (Arquivo Fonte de Dados) files according to Brazilian labor regulations (Portaria 671/1510). The system provides administrative capabilities for managing employee time records, generating monthly timesheets, and exporting reports.

Key features include:
- AFD file import and processing (Type 3 records - time punches)
- Monthly timesheet mirror generation with automatic hour calculations
- PDF/Excel report exports
- Employee management (CRUD operations)
- Company settings configuration
- Audit logging for all time record modifications

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack Query for server state synchronization
- **UI Components**: Shadcn/UI component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Forms**: React Hook Form with Zod validation

The frontend follows a page-based structure under `client/src/pages/` with protected routes for authenticated users and admin-only sections.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Authentication**: Passport.js with Local Strategy and session-based auth
- **File Uploads**: Multer for AFD file processing
- **Build Tool**: Custom esbuild script for production bundling

API routes are defined in `server/routes.ts` with a typed contract system in `shared/routes.ts` using Zod schemas for input/output validation.

### Data Storage
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Generated to `./migrations` directory via `drizzle-kit push`

Key tables:
- `users` - Employee records with PIS/CPF for AFD linking
- `punches` - Time punch records linked to users and AFD files
- `afd_files` - Uploaded AFD file metadata
- `company_settings` - Company information for reports
- `audit_logs` - Tracking all modifications to time records

### Authentication Flow
- Session-based authentication using express-session
- Default admin user created on first access (username: admin, password: admin)
- Plaintext passwords for MVP (noted for future bcrypt implementation)
- Role-based access control (admin vs employee)

### Shared Code Pattern
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Database table definitions and Zod schemas
- `routes.ts` - Typed API contract definitions

Path aliases are configured:
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database operations with migration support

### Third-Party Libraries
- **date-fns**: Date formatting and manipulation for timesheet calculations
- **jspdf / jspdf-autotable**: PDF generation for timesheet reports
- **xlsx**: Excel export functionality
- **recharts**: Dashboard visualization charts

### Authentication
- **Passport.js**: Authentication middleware with Local Strategy
- **express-session**: Session management (MemoryStore for MVP, recommend Redis for production)

### Build & Development
- **Vite**: Frontend development server and build tool
- **esbuild**: Server-side production bundling
- **Replit plugins**: Development banner and cartographer for Replit environment

### UI Framework
- **Shadcn/UI**: Component library configuration in `components.json`
- **Radix UI**: Accessible UI primitives
- **Tailwind CSS**: Utility-first styling with custom theme extensions