# Presto Cuotas — Especificación de Endpoints REST (API-First)

Base URL: `https://api.prestocuotas.com/api/v1`

Convenciones:
- Autenticación: `Authorization: Bearer <access_token>` (JWT). Endpoints públicos marcados explícitamente.
- Respuestas de error: `{ "statusCode": 400, "message": "...", "errors": [...] }`.
- Paginación: `?page=1&limit=20` → respuesta `{ data: [...], meta: { total, page, limit } }`.
- Documentado además vía OpenAPI/Swagger en `/docs` — es el contrato consumido por la futura app Android (generación de cliente tipado con `orval`/`openapi-generator`).

---

## Auth

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Público | Login de usuario interno (backoffice) o cliente (portal), devuelve access+refresh token. |
| POST | `/auth/refresh` | Público (requiere refresh token) | Renueva access token. |
| POST | `/auth/logout` | Autenticado | Invalida refresh token. |

## Público / Simulador (sin autenticación)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/public/simulador?monto=100000&cuotas=12` | Devuelve TNA, TEA, cuota estimada y CFT según `configuracion_tasas` vigente. |
| GET | `/public/configuracion` | Rangos válidos de monto/cuotas para mostrar en el simulador (límites min/max). |

## Onboarding / Clientes (Wizard KYC)

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/clientes` | Público | Alta de datos personales (DNI, CUIL, teléfono, email, fecha nacimiento). Devuelve `cliente_id` + token temporal de sesión de onboarding. |
| POST | `/clientes/{id}/documentos` | Público (con token de sesión) | Sube documento KYC (`multipart/form-data`), `tipo`: `DNI_FRENTE`/`DNI_DORSO`/`SELFIE`. Dispara verificación de liveness async. |
| GET | `/clientes/{id}/documentos/estado` | Público (con token) | Polling del estado de verificación de liveness/OCR. |
| POST | `/clientes/{id}/firma` | Público (con token) | Registra aceptación de T&C + firma digital (hash + timestamp + IP). |
| GET | `/clientes/{id}` | Cliente propio / Backoffice | Datos del cliente. |
| PATCH | `/clientes/{id}` | Cliente propio / Admin | Actualización de datos de contacto. |
| POST | `/clientes/login` | Público | Login del portal de cliente (DNI + contraseña u OTP). |

## Solicitudes / Motor Crediticio

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/solicitudes` | Cliente | Crea solicitud (`monto_solicitado`, `cantidad_cuotas`). Encola consulta a buró automáticamente. |
| GET | `/solicitudes/{id}` | Cliente propio / Backoffice | Detalle + estado actual. |
| GET | `/solicitudes` | Analista/Admin | Listado con filtros (`estado`, `fecha_desde`, `fecha_hasta`, `cliente`), paginado — alimenta el dashboard de revisión. |
| GET | `/solicitudes/{id}/buro` | Analista/Admin | Informe de Nosis/Veraz/BCRA asociado (`logs_buro`). |
| GET | `/solicitudes/{id}/documentos` | Analista/Admin | Visor de documentos KYC (URLs firmadas de corta duración). |
| PATCH | `/solicitudes/{id}/decision` | Analista/Admin | `{ decision: 'APROBADA' \| 'RECHAZADA_MANUAL', motivo? }`. Si aprueba, genera `prestamos` + `cuotas`. |

## Préstamos / Cuotas / Estado de cuenta

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/prestamos/{id}` | Cliente propio / Backoffice | Detalle del préstamo. |
| GET | `/prestamos/{id}/cuotas` | Cliente propio / Backoffice | Plan de cuotas completo con estado de cada una. |
| GET | `/prestamos/{id}/estado-cuenta` | Cliente propio / Backoffice | Resumen: pagado, pendiente, próximo vencimiento. |
| POST | `/prestamos/{id}/entrega` | Cajero/Admin | Registra entrega física del préstamo en sucursal (pasa `PENDIENTE_ENTREGA` → `ACTIVO`). |
| POST | `/prestamos/{id}/estado-cuenta/whatsapp` | Cliente propio | Genera enlace `wa.me` con estado de cuenta (ver `03-WHATSAPP-INTEGRATION.md`). |
| POST | `/prestamos/{id}/estado-cuenta/email` | Cliente propio | Envía estado de cuenta por email (PDF adjunto). |

## Caja (Cobro presencial)

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/caja/clientes/buscar?dni=...` o `?prestamo=...` | Cajero/Admin | Búsqueda ágil de cliente/préstamo para cobro. |
| POST | `/caja/cuotas/{cuotaId}/pago` | Cajero/Admin | Registra cobro (`monto`, `metodo_pago`). Calcula saldo automáticamente, permite pago parcial. |
| GET | `/caja/pagos/{pagoId}/comprobante` | Cajero/Admin | Genera comprobante en PDF (imprimible). |
| GET | `/caja/cierre?sucursal_id=&fecha=` | Cajero/Admin | Totales de caja del día para arqueo. |

## Cobranzas

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/cobranzas/vencimientos?desde=&hasta=&sucursal_id=` | Operador/Admin | Cuotas próximas a vencer o vencidas, para gestión proactiva. |
| POST | `/cobranzas/{prestamoId}/recordatorio-whatsapp` | Operador/Admin | Genera enlace `wa.me` hacia el **cliente** con recordatorio de vencimiento (ver doc de WhatsApp). |

## Usuarios y Permisos (RBAC) — solo Admin General

| Método | Endpoint | Descripción |
|---|---|---|
| GET/POST | `/usuarios` | Listado / alta de usuarios internos. |
| PATCH | `/usuarios/{id}` | Editar rol, sucursal, estado activo. |
| GET | `/roles` | Listado de roles disponibles. |
| GET/PATCH | `/configuracion/tasas` | Consultar / crear nueva versión de tasas (TNA, TEA, mora, gastos, límites). Nunca se edita una tasa vigente ya usada por préstamos activos: se versiona. |

## CRM

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/clientes/{id}/historial` | Backoffice | Historial completo: solicitudes previas, préstamos, pagos, scoring interno, documentos adjuntos. |
| GET | `/clientes/{id}/notas` | Backoffice | Notas internas de seguimiento (atención al cliente). |
| POST | `/clientes/{id}/notas` | Backoffice | Agrega nota. |

---

## Notas para el diseño de la app Android

- Todos los endpoints anteriores son directamente reutilizables — no existe lógica exclusiva de "web" en el backend.
- Los endpoints de subida de documentos (`/clientes/{id}/documentos`) deben aceptar el mismo `multipart/form-data` que enviaría una cámara nativa Android, sin transformación intermedia en el frontend web.
- El cliente API para React Native se genera automáticamente desde el spec OpenAPI expuesto en `/docs-json`, evitando mantener dos definiciones de contrato.
