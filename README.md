# JobTracker ATS – Frontend

Applicant Tracking System – Frontend React + Vite.

## Tech Stack

- React 18+ (function components, hooks)
- JavaScript (ES2022+)
- Vite
- React Router v6
- Zustand
- Axios
- CSS Modules

## Cấu trúc thư mục

```
src/
├── api/              # API client, base config, interceptors
├── components/       # Shared UI components
├── features/         # Feature modules (jobs, applications, ...)
├── hooks/            # Custom hooks
├── layouts/          # App layout, auth layout
├── pages/            # Route pages
├── routes/           # Route config, guards
├── store/            # State (Zustand)
├── styles/           # variables.css, reset.css, components/*.module.css
└── utils/            # Helpers
```

## Chạy

```bash
npm install
npm run dev
```

Build: `npm run build`

## API

- Base URL: `VITE_API_BASE` (mặc định `/api/v1`)
- Proxy: Vite proxy `/api` → `http://localhost:8080` (dev)

## Tài liệu

- [docs/FRONTEND_FRAMEWORK.md](docs/FRONTEND_FRAMEWORK.md) – Framework, routes, modules
- [docs/API.md](docs/API.md) – API endpoints
- [docs/BUSINESS_FLOWS.md](docs/BUSINESS_FLOWS.md) – Business flows

## Cursor Rules

- `.cursor/rules/frontend-react-vite.mdc` – CSS naming, tech stack, conventions
