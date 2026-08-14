# Presto Cuotas — Generación de enlaces `wa.me`

## 1. Dos flujos distintos, dos números de destino

Es clave no confundirlos porque el número destino cambia:

| Flujo | Origen del clic | Número destino (`<phone>`) | Quién escribe el mensaje |
|---|---|---|---|
| **Estado de cuenta** (Portal de Cliente) | Cliente logueado en su portal | Número de WhatsApp Business **de la empresa** (fijo, en config) | Se pre-llena un mensaje que el cliente envía a la empresa, con su DNI y N° de préstamo, para que el operador lo identifique rápido. |
| **Recordatorio de vencimiento** (Backoffice / Cobranzas) | Operador en el módulo de Cobranzas | Número de teléfono **del cliente** (dinámico, desde `clientes.telefono`) | Se pre-llena un mensaje personalizado que el operador revisa y envía al cliente. |

## 2. Formato del enlace

```
https://wa.me/<numero_e164_sin_signo_mas>?text=<mensaje_url_encoded>
```

- `<numero_e164_sin_signo_mas>`: solo dígitos, código de país incluido, **sin** `+`, espacios ni guiones.
  - Argentina, línea móvil: código país `54` + `9` (prefijo obligatorio para celulares en WhatsApp) + código de área sin el `0` + número sin el `15`.
    - Ejemplo: un cliente con `011 15-2233-4455` → `5491122334455`.
  - Este armado debe hacerse en el backend a partir del teléfono normalizado que se guarda en `clientes.telefono` (guardarlo ya en formato E.164 evita reprocesar reglas de "9" y "15" en cada generación de link).
- `<mensaje_url_encoded>`: el texto codificado con `encodeURIComponent` (JS) o `urllib.parse.quote` (Python) — **no** usar `+` para espacios (eso es `application/x-www-form-urlencoded`, no lo que espera `wa.me`); deben ser `%20`.

## 3. Plantillas de mensaje

Se recomienda definir las plantillas en configuración (no hardcodeadas), con placeholders reemplazados en backend antes de codificar:

**Estado de cuenta (cliente → empresa):**
```
Hola, soy {{nombre}} {{apellido}} (DNI {{dni}}). Quiero consultar el estado de cuenta de mi préstamo N° {{numero_prestamo}}.
```

**Recordatorio de vencimiento (empresa → cliente):**
```
Hola {{nombre}}, te recordamos que la cuota N° {{numero_cuota}} de tu préstamo {{numero_prestamo}} por ${{monto_cuota}} vence el {{fecha_vencimiento}}. Podés abonarla en nuestra sucursal {{sucursal_nombre}} ({{sucursal_direccion}}). Ante dudas, respondé este mensaje.
```

## 4. Implementación de referencia (NestJS / TypeScript)

```typescript
// whatsapp-link.service.ts

interface PlantillaContexto {
  [key: string]: string | number;
}

function normalizarTelefonoArgentinaE164(telefonoLocal: string): string {
  // Se asume que clientes.telefono ya está normalizado a E.164 al momento del alta
  // (validación en el wizard de onboarding). Esta función queda como resguardo
  // para datos legacy sin normalizar.
  const soloDigitos = telefonoLocal.replace(/\D/g, '');
  if (soloDigitos.startsWith('54')) return soloDigitos;
  // Inserta código de país (54) y prefijo móvil (9) si falta
  const sinCero = soloDigitos.replace(/^0/, '');
  const sinQuince = sinCero.replace(/15(?=\d{6,8}$)/, '');
  return `549${sinQuince}`;
}

function renderPlantilla(plantilla: string, contexto: PlantillaContexto): string {
  return plantilla.replace(/{{(\w+)}}/g, (_, key) =>
    contexto[key] !== undefined ? String(contexto[key]) : `{{${key}}}`,
  );
}

export function generarLinkWhatsApp(
  telefonoDestino: string,
  plantilla: string,
  contexto: PlantillaContexto,
): string {
  const numero = normalizarTelefonoArgentinaE164(telefonoDestino);
  const mensaje = renderPlantilla(plantilla, contexto);
  const mensajeCodificado = encodeURIComponent(mensaje);
  return `https://wa.me/${numero}?text=${mensajeCodificado}`;
}

// --- Uso: estado de cuenta (cliente -> empresa) ---
const linkEstadoCuenta = generarLinkWhatsApp(
  process.env.WHATSAPP_NUMERO_EMPRESA, // fijo, ej. '5491100000000'
  PLANTILLA_ESTADO_CUENTA,
  {
    nombre: cliente.nombres,
    apellido: cliente.apellidos,
    dni: cliente.dni,
    numero_prestamo: prestamo.id,
  },
);

// --- Uso: recordatorio de vencimiento (empresa -> cliente) ---
const linkRecordatorio = generarLinkWhatsApp(
  cliente.telefono, // dinámico
  PLANTILLA_RECORDATORIO,
  {
    nombre: cliente.nombres,
    numero_cuota: cuota.numero_cuota,
    numero_prestamo: prestamo.id,
    monto_cuota: cuota.monto_total.toFixed(2),
    fecha_vencimiento: formatFechaAR(cuota.fecha_vencimiento),
    sucursal_nombre: sucursal.nombre,
    sucursal_direccion: sucursal.direccion,
  },
);
```

## 5. Trazabilidad

Cada enlace generado se registra en `mensajes_whatsapp_log` (ver `db/schema.sql`) con el texto final, el número destino y quién lo generó (`generado_por` = `NULL` si lo generó el propio cliente desde el portal). Esto es importante porque el envío real ocurre fuera del sistema (dentro de WhatsApp) — el log es la única evidencia interna de que se intentó el contacto, útil tanto para cobranzas como para auditoría de atención al cliente.

## 6. Validaciones a nivel API

- `POST /prestamos/{id}/estado-cuenta/whatsapp` y `POST /cobranzas/{prestamoId}/recordatorio-whatsapp` devuelven `{ url: string }`; el frontend simplemente hace `window.open(url, '_blank')` — no se intenta enviar el mensaje automáticamente (`wa.me` siempre requiere confirmación manual del usuario en la app de WhatsApp, por diseño de Meta).
- Si `clientes.telefono` no pasa la validación E.164, el endpoint de recordatorio debe devolver `422` en vez de generar un link roto.
