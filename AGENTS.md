# Commerce CMS - Agent Guide

## Project Overview

Commerce CMS is a complete e-commerce solution for managing a digital catalog for a retail store (polirrubro). It includes:
- **Admin Panel (CMS)**: Manage products, categories, and store settings
- **Public Catalog**: Customer-facing product catalog with shopping cart and WhatsApp ordering
- **Backend API**: Express.js server with PostgreSQL storage

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **Backend**: Express 4 + PostgreSQL
- **Authentication**: Token-based (Bearer token)
- **Database**: PostgreSQL with schema in `db/base_completa.sql`

## Project Structure

```
cms/
├── cms/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── cms/      # Admin panel components
│   │   └── catalog/  # Public catalog components
│   └── package.json
├── backend/
│   └── cms/          # Express API server
│       ├── src/      # Storage layer, routes
│       ├── api/      # Serverless functions (Vercel)
│       └── package.json
├── utils/            # Shared utilities (formatting, icons, accessibility)
├── db/               # Database schema (base_completa.sql)
└── iniciar-cms.bat   # Windows launcher script
```

## Development Commands

### Frontend
```bash
cd cms
npm run dev          # Start Vite dev server (port 5178)
npm run build        # Build for production
```

### Backend
```bash
cd backend/cms
npm run db:init      # Initialize/update database schema
npm run dev          # Start Express server (port 3001)
```

### Full Stack
Run `iniciar-cms.bat` to start PostgreSQL, API, frontend, and open browser.

## Environment Variables

### Frontend (.env)
- `VITE_API_URL`: Backend API URL (empty for localhost:3001)

### Backend (backend/cms/.env)
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: API port (default 3001)
- `ADMIN_USER`/`ADMIN_PASSWORD`: Initial admin credentials
- `SMTP_*`: Email configuration for user registration/password recovery
- `ALLOWED_ORIGINS`: CORS allowed origins

## Key Features

### CMS Panel
- Product CRUD with auto-save to localStorage
- Category management with draft/restore functionality
- Hero section customization (name, slogan, background image)
- Export catalog to JSON or PDF
- Dark/light theme toggle

### Public Catalog
- Product filtering and search
- Shopping cart with WhatsApp ordering
- Dynamic SEO (meta tags)
- Social sharing
- Responsive design

## Data Flow

1. CMS loads data from API (`GET /api/catalog`)
2. With active session, changes sync to backend via `PUT /api/catalog`
3. Without session, changes save to localStorage only
4. "Export catalog" generates `catalog/data.json` for static hosting

## Database

- PostgreSQL with schema in `db/base_completa.sql`
- Tables: settings, products, categories, admins, sessions, login_attempts
- Run `npm run db:init` to initialize/update schema
- First admin registers via catalog (ADMIN button) or via `ADMIN_USER`/`ADMIN_PASSWORD` env vars

## Testing

No test framework configured. Manual testing recommended:
1. Start dev servers (`npm run dev` in both cms/ and backend/cms/)
2. Test CMS panel at http://localhost:5178/cms/
3. Test catalog at http://localhost:5178/catalog/catalog.html
4. Verify backend API at http://localhost:3001/api/health

## Deployment

Production deployment uses:
- **Frontend**: Cloudflare Pages (static build)
- **Backend**: Vercel (serverless functions)
- **Database**: Supabase (PostgreSQL)

See README.md for detailed deployment instructions.