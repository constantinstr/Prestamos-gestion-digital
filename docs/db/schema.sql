-- ============================================================
-- Presto Cuotas — Modelo de Base de Datos Relacional (PostgreSQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- RBAC: roles y usuarios internos (backoffice)
-- ---------------------------------------------------------
CREATE TABLE roles (
    id              SMALLSERIAL PRIMARY KEY,
    nombre          VARCHAR(50) NOT NULL UNIQUE, -- 'ADMIN_GENERAL', 'ANALISTA_CREDITO', 'CAJERO'
    descripcion     TEXT
);

CREATE TABLE sucursales (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    direccion       VARCHAR(255) NOT NULL,
    telefono        VARCHAR(30),
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(120) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    rol_id          SMALLINT NOT NULL REFERENCES roles(id),
    sucursal_id     INTEGER REFERENCES sucursales(id), -- NULL para roles no atados a sucursal (ej. Admin)
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- Clientes y KYC
-- ---------------------------------------------------------
CREATE TABLE clientes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dni             VARCHAR(15) NOT NULL UNIQUE,
    cuil            VARCHAR(15) NOT NULL UNIQUE,
    nombres         VARCHAR(120) NOT NULL,
    apellidos       VARCHAR(120) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    telefono        VARCHAR(30) NOT NULL,   -- formato E.164, ej. 5491122334455
    email           VARCHAR(150),
    direccion       VARCHAR(255),
    estado          VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
                    CHECK (estado IN ('ACTIVO', 'INACTIVO', 'BLOQUEADO')),
    scoring_interno SMALLINT, -- calculado a partir de historial propio (pagos, morosidad)
    password_hash   VARCHAR(255), -- login al portal de cliente
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documentos_kyc (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo            VARCHAR(20) NOT NULL
                    CHECK (tipo IN ('DNI_FRENTE', 'DNI_DORSO', 'SELFIE', 'FIRMA')),
    storage_key     VARCHAR(500) NOT NULL, -- key en bucket S3, no URL pública
    hash_integridad VARCHAR(128) NOT NULL, -- SHA-256 del archivo, para verificar no alteración
    liveness_score  NUMERIC(5,2),          -- solo aplica a SELFIE
    verificado      BOOLEAN NOT NULL DEFAULT FALSE,
    verificado_por  UUID REFERENCES usuarios(id), -- si requiere validación manual
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documentos_kyc_cliente ON documentos_kyc(cliente_id);

-- ---------------------------------------------------------
-- Configuración de tasas (versionada en el tiempo)
-- ---------------------------------------------------------
CREATE TABLE configuracion_tasas (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(100) NOT NULL,
    tna                     NUMERIC(6,3) NOT NULL,  -- Tasa Nominal Anual (%)
    tea                     NUMERIC(6,3) NOT NULL,  -- Tasa Efectiva Anual (%)
    mora_diaria_pct         NUMERIC(6,3) NOT NULL DEFAULT 0, -- recargo por mora diario (%)
    gastos_administrativos  NUMERIC(12,2) NOT NULL DEFAULT 0,
    monto_minimo            NUMERIC(12,2) NOT NULL,
    monto_maximo            NUMERIC(12,2) NOT NULL,
    cuotas_minimas          SMALLINT NOT NULL,
    cuotas_maximas          SMALLINT NOT NULL,
    vigente_desde           TIMESTAMPTZ NOT NULL DEFAULT now(),
    vigente_hasta           TIMESTAMPTZ,
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por              UUID REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- Solicitudes y motor crediticio
-- ---------------------------------------------------------
CREATE TABLE solicitudes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id          UUID NOT NULL REFERENCES clientes(id),
    monto_solicitado    NUMERIC(12,2) NOT NULL CHECK (monto_solicitado > 0),
    cantidad_cuotas     SMALLINT NOT NULL CHECK (cantidad_cuotas > 0),
    canal               VARCHAR(20) NOT NULL DEFAULT 'WEB'
                        CHECK (canal IN ('WEB', 'APP', 'SUCURSAL')),
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                        CHECK (estado IN (
                            'PENDIENTE', 'CONSULTANDO_BURO', 'PRE_APROBADA',
                            'EN_REVISION', 'APROBADA', 'RECHAZADA_AUTOMATICA',
                            'RECHAZADA_MANUAL', 'CANCELADA'
                        )),
    analista_id         UUID REFERENCES usuarios(id), -- quien resolvió el caso en revisión manual
    motivo_rechazo      TEXT,
    configuracion_tasas_id INTEGER REFERENCES configuracion_tasas(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    resuelto_at         TIMESTAMPTZ
);
CREATE INDEX idx_solicitudes_cliente ON solicitudes(cliente_id);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);

CREATE TABLE logs_buro (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id    UUID NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    proveedor       VARCHAR(20) NOT NULL CHECK (proveedor IN ('NOSIS', 'VERAZ', 'BCRA')),
    score           SMALLINT,
    situacion_bcra  SMALLINT, -- 1 a 6, Central de Deudores
    respuesta_raw   JSONB NOT NULL, -- payload completo devuelto por el buró, para auditoría
    consultado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logs_buro_solicitud ON logs_buro(solicitud_id);

-- ---------------------------------------------------------
-- Préstamos y cuotas
-- ---------------------------------------------------------
CREATE TABLE prestamos (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id            UUID NOT NULL UNIQUE REFERENCES solicitudes(id),
    cliente_id              UUID NOT NULL REFERENCES clientes(id),
    monto_otorgado          NUMERIC(12,2) NOT NULL CHECK (monto_otorgado > 0),
    tna                     NUMERIC(6,3) NOT NULL,
    tea                     NUMERIC(6,3) NOT NULL,
    cantidad_cuotas         SMALLINT NOT NULL,
    fecha_desembolso        DATE,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE_ENTREGA'
                            CHECK (estado IN (
                                'PENDIENTE_ENTREGA', 'ACTIVO', 'EN_MORA',
                                'FINALIZADO', 'CANCELADO'
                            )),
    sucursal_entrega_id     INTEGER REFERENCES sucursales(id),
    usuario_entrega_id      UUID REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prestamos_cliente ON prestamos(cliente_id);
CREATE INDEX idx_prestamos_estado ON prestamos(estado);

CREATE TABLE cuotas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prestamo_id         UUID NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
    numero_cuota        SMALLINT NOT NULL,
    monto_capital       NUMERIC(12,2) NOT NULL,
    monto_interes       NUMERIC(12,2) NOT NULL,
    monto_total          NUMERIC(12,2) NOT NULL,
    fecha_vencimiento   DATE NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                        CHECK (estado IN ('PENDIENTE', 'PAGADA', 'VENCIDA', 'PARCIAL')),
    saldo_pendiente     NUMERIC(12,2) NOT NULL,
    UNIQUE (prestamo_id, numero_cuota)
);
CREATE INDEX idx_cuotas_prestamo ON cuotas(prestamo_id);
CREATE INDEX idx_cuotas_estado_vencimiento ON cuotas(estado, fecha_vencimiento);

CREATE TABLE pagos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cuota_id            UUID NOT NULL REFERENCES cuotas(id),
    prestamo_id         UUID NOT NULL REFERENCES prestamos(id),
    monto               NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    metodo_pago         VARCHAR(20) NOT NULL DEFAULT 'EFECTIVO'
                        CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA')),
    sucursal_id         INTEGER REFERENCES sucursales(id),
    usuario_cajero_id   UUID REFERENCES usuarios(id),
    comprobante_numero  VARCHAR(30) NOT NULL UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pagos_prestamo ON pagos(prestamo_id);
CREATE INDEX idx_pagos_cuota ON pagos(cuota_id);

-- ---------------------------------------------------------
-- Cobranzas / WhatsApp
-- ---------------------------------------------------------
CREATE TABLE mensajes_whatsapp_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id      UUID REFERENCES clientes(id),
    prestamo_id     UUID REFERENCES prestamos(id),
    tipo_mensaje    VARCHAR(30) NOT NULL
                    CHECK (tipo_mensaje IN ('ESTADO_CUENTA', 'RECORDATORIO_VENCIMIENTO', 'OTRO')),
    telefono_destino VARCHAR(30) NOT NULL,
    mensaje_texto   TEXT NOT NULL,
    url_generada    TEXT NOT NULL,
    generado_por    UUID REFERENCES usuarios(id), -- NULL si lo generó el propio cliente
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------
CREATE TABLE auditoria (
    id              BIGSERIAL PRIMARY KEY,
    usuario_id      UUID REFERENCES usuarios(id),
    accion          VARCHAR(50) NOT NULL, -- 'APROBAR_SOLICITUD', 'REGISTRAR_PAGO', 'CAMBIAR_TASA', ...
    entidad         VARCHAR(50) NOT NULL, -- 'solicitudes', 'prestamos', 'pagos', ...
    entidad_id      VARCHAR(50) NOT NULL,
    detalle         JSONB,
    ip_origen       INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_entidad ON auditoria(entidad, entidad_id);

-- ---------------------------------------------------------
-- Seed mínimo de roles
-- ---------------------------------------------------------
INSERT INTO roles (nombre, descripcion) VALUES
    ('ADMIN_GENERAL', 'Configuración de tasas, gastos, límites y gestión de usuarios'),
    ('ANALISTA_CREDITO', 'Verificación KYC y aprobación/rechazo de solicitudes'),
    ('CAJERO', 'Registro de cobros y entrega de préstamos en sucursal');
