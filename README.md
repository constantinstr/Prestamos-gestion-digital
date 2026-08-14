# Presto Cuotas

Plataforma Fintech para digitalizar el otorgamiento y gestión de préstamos personales, de forma híbrida: solicitud online con KYC digital, evaluación automática/manual vía burós de crédito, y cobro presencial en sucursal.

Arquitectura **API-First**: un único backend (NestJS + PostgreSQL) sirve a la webapp pública, el portal de cliente, el backoffice y la futura app móvil Android.

## Estructura del repositorio

```
├── backend/         # API NestJS (TypeScript) — lógica de negocio, auth, RBAC
├── frontend-web/     # Next.js — landing, simulador, portal de cliente y backoffice
├── docs/             # Documentación de arquitectura, modelo de datos y API
│   ├── 01-ARQUITECTURA.md
│   ├── 02-API-ENDPOINTS.md
│   ├── 03-WHATSAPP-INTEGRATION.md
│   └── db/schema.sql
```

## Quick start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # completar credenciales de DB y proveedores externos
npm run start:dev
```
API disponible en `http://localhost:3000/api/v1`, documentación Swagger en `http://localhost:3000/docs`.

### Frontend
```bash
cd frontend-web
npm install
npm run dev
```
Disponible en `http://localhost:3001`.

## Documentación

Ver [`docs/01-ARQUITECTURA.md`](docs/01-ARQUITECTURA.md) para el detalle completo de stack, diagrama de componentes y flujo de negocio.
