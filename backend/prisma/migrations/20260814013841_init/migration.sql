-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "TipoDocumentoKyc" AS ENUM ('DNI_FRENTE', 'DNI_DORSO', 'SELFIE', 'FIRMA');

-- CreateEnum
CREATE TYPE "EstadoInvitacion" AS ENUM ('PENDIENTE', 'USADA', 'EXPIRADA', 'REVOCADA');

-- CreateEnum
CREATE TYPE "CanalSolicitud" AS ENUM ('WEB', 'APP', 'SUCURSAL');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'CONSULTANDO_BURO', 'PRE_APROBADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA_AUTOMATICA', 'RECHAZADA_MANUAL', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ProveedorBuro" AS ENUM ('NOSIS', 'VERAZ', 'BCRA');

-- CreateEnum
CREATE TYPE "EstadoOferta" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'EXPIRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoPrestamo" AS ENUM ('PENDIENTE_ENTREGA', 'ACTIVO', 'EN_MORA', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA', 'PARCIAL');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "TipoMensajeWhatsapp" AS ENUM ('ESTADO_CUENTA', 'RECORDATORIO_VENCIMIENTO', 'OTRO');

-- CreateTable
CREATE TABLE "organizaciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "razon_social" TEXT,
    "cuit" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" SERIAL NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "cuil" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "estado" "EstadoCliente" NOT NULL DEFAULT 'ACTIVO',
    "scoring_interno" INTEGER,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_kyc" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo" "TipoDocumentoKyc" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "hash_integridad" TEXT NOT NULL,
    "liveness_score" DECIMAL(5,2),
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "verificado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitaciones_cliente" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "estado" "EstadoInvitacion" NOT NULL DEFAULT 'PENDIENTE',
    "creado_por" TEXT NOT NULL,
    "cliente_id" TEXT,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usada_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_tasas" (
    "id" SERIAL NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tna" DECIMAL(6,3) NOT NULL,
    "tea" DECIMAL(6,3) NOT NULL,
    "mora_diaria_pct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "gastos_administrativos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_minimo" DECIMAL(12,2) NOT NULL,
    "monto_maximo" DECIMAL(12,2) NOT NULL,
    "cuotas_minimas" INTEGER NOT NULL,
    "cuotas_maximas" INTEGER NOT NULL,
    "vigente_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_tasas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "monto_solicitado" DECIMAL(12,2) NOT NULL,
    "cantidad_cuotas" INTEGER NOT NULL,
    "canal" "CanalSolicitud" NOT NULL DEFAULT 'WEB',
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "analista_id" TEXT,
    "motivo_rechazo" TEXT,
    "configuracion_tasas_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resuelto_at" TIMESTAMP(3),

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_buro" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "solicitud_id" TEXT,
    "proveedor" "ProveedorBuro" NOT NULL,
    "score" INTEGER,
    "situacion_bcra" INTEGER,
    "respuesta_raw" JSONB NOT NULL,
    "consultado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_buro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas_prestamo" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "ofrecido_por" TEXT NOT NULL,
    "monto_ofrecido" DECIMAL(12,2) NOT NULL,
    "cantidad_cuotas" INTEGER NOT NULL,
    "tna" DECIMAL(6,3) NOT NULL,
    "tea" DECIMAL(6,3) NOT NULL,
    "configuracion_tasas_id" INTEGER,
    "estado" "EstadoOferta" NOT NULL DEFAULT 'PENDIENTE',
    "expira_en" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "aceptada_en" TIMESTAMP(3),
    "aceptada_ip" TEXT,
    "aceptada_user_agent" TEXT,
    "hash_documento" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ofertas_prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamos" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "solicitud_id" TEXT,
    "oferta_id" TEXT,
    "cliente_id" TEXT NOT NULL,
    "monto_otorgado" DECIMAL(12,2) NOT NULL,
    "tna" DECIMAL(6,3) NOT NULL,
    "tea" DECIMAL(6,3) NOT NULL,
    "cantidad_cuotas" INTEGER NOT NULL,
    "fecha_desembolso" DATE,
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'PENDIENTE_ENTREGA',
    "sucursal_entrega_id" INTEGER,
    "usuario_entrega_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestamos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas" (
    "id" TEXT NOT NULL,
    "prestamo_id" TEXT NOT NULL,
    "numero_cuota" INTEGER NOT NULL,
    "monto_capital" DECIMAL(12,2) NOT NULL,
    "monto_interes" DECIMAL(12,2) NOT NULL,
    "monto_total" DECIMAL(12,2) NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "saldo_pendiente" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "cuota_id" TEXT NOT NULL,
    "prestamo_id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "sucursal_id" INTEGER,
    "usuario_cajero_id" TEXT,
    "comprobante_numero" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_whatsapp_log" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "prestamo_id" TEXT,
    "tipo_mensaje" "TipoMensajeWhatsapp" NOT NULL,
    "telefono_destino" TEXT NOT NULL,
    "mensaje_texto" TEXT NOT NULL,
    "url_generada" TEXT NOT NULL,
    "generado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_whatsapp_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "detalle" JSONB,
    "ip_origen" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_cuit_key" ON "organizaciones"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE INDEX "sucursales_organizacion_id_idx" ON "sucursales"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_organizacion_id_idx" ON "usuarios"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_dni_key" ON "clientes"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cuil_key" ON "clientes"("cuil");

-- CreateIndex
CREATE INDEX "clientes_organizacion_id_idx" ON "clientes"("organizacion_id");

-- CreateIndex
CREATE INDEX "documentos_kyc_cliente_id_idx" ON "documentos_kyc"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_cliente_token_key" ON "invitaciones_cliente"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_cliente_cliente_id_key" ON "invitaciones_cliente"("cliente_id");

-- CreateIndex
CREATE INDEX "invitaciones_cliente_organizacion_id_idx" ON "invitaciones_cliente"("organizacion_id");

-- CreateIndex
CREATE INDEX "configuracion_tasas_organizacion_id_idx" ON "configuracion_tasas"("organizacion_id");

-- CreateIndex
CREATE INDEX "solicitudes_cliente_id_idx" ON "solicitudes"("cliente_id");

-- CreateIndex
CREATE INDEX "solicitudes_estado_idx" ON "solicitudes"("estado");

-- CreateIndex
CREATE INDEX "logs_buro_cliente_id_idx" ON "logs_buro"("cliente_id");

-- CreateIndex
CREATE INDEX "logs_buro_solicitud_id_idx" ON "logs_buro"("solicitud_id");

-- CreateIndex
CREATE INDEX "ofertas_prestamo_organizacion_id_idx" ON "ofertas_prestamo"("organizacion_id");

-- CreateIndex
CREATE INDEX "ofertas_prestamo_cliente_id_idx" ON "ofertas_prestamo"("cliente_id");

-- CreateIndex
CREATE INDEX "ofertas_prestamo_estado_idx" ON "ofertas_prestamo"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "prestamos_solicitud_id_key" ON "prestamos"("solicitud_id");

-- CreateIndex
CREATE UNIQUE INDEX "prestamos_oferta_id_key" ON "prestamos"("oferta_id");

-- CreateIndex
CREATE INDEX "prestamos_organizacion_id_idx" ON "prestamos"("organizacion_id");

-- CreateIndex
CREATE INDEX "prestamos_cliente_id_idx" ON "prestamos"("cliente_id");

-- CreateIndex
CREATE INDEX "prestamos_estado_idx" ON "prestamos"("estado");

-- CreateIndex
CREATE INDEX "cuotas_prestamo_id_idx" ON "cuotas"("prestamo_id");

-- CreateIndex
CREATE INDEX "cuotas_estado_fecha_vencimiento_idx" ON "cuotas"("estado", "fecha_vencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "cuotas_prestamo_id_numero_cuota_key" ON "cuotas"("prestamo_id", "numero_cuota");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_comprobante_numero_key" ON "pagos"("comprobante_numero");

-- CreateIndex
CREATE INDEX "pagos_prestamo_id_idx" ON "pagos"("prestamo_id");

-- CreateIndex
CREATE INDEX "pagos_cuota_id_idx" ON "pagos"("cuota_id");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- AddForeignKey
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_kyc" ADD CONSTRAINT "documentos_kyc_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_kyc" ADD CONSTRAINT "documentos_kyc_verificado_por_fkey" FOREIGN KEY ("verificado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones_cliente" ADD CONSTRAINT "invitaciones_cliente_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones_cliente" ADD CONSTRAINT "invitaciones_cliente_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones_cliente" ADD CONSTRAINT "invitaciones_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_tasas" ADD CONSTRAINT "configuracion_tasas_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_tasas" ADD CONSTRAINT "configuracion_tasas_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_analista_id_fkey" FOREIGN KEY ("analista_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_configuracion_tasas_id_fkey" FOREIGN KEY ("configuracion_tasas_id") REFERENCES "configuracion_tasas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_buro" ADD CONSTRAINT "logs_buro_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_buro" ADD CONSTRAINT "logs_buro_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_prestamo" ADD CONSTRAINT "ofertas_prestamo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_prestamo" ADD CONSTRAINT "ofertas_prestamo_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_prestamo" ADD CONSTRAINT "ofertas_prestamo_ofrecido_por_fkey" FOREIGN KEY ("ofrecido_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertas_prestamo" ADD CONSTRAINT "ofertas_prestamo_configuracion_tasas_id_fkey" FOREIGN KEY ("configuracion_tasas_id") REFERENCES "configuracion_tasas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_oferta_id_fkey" FOREIGN KEY ("oferta_id") REFERENCES "ofertas_prestamo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_sucursal_entrega_id_fkey" FOREIGN KEY ("sucursal_entrega_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_usuario_entrega_id_fkey" FOREIGN KEY ("usuario_entrega_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cuota_id_fkey" FOREIGN KEY ("cuota_id") REFERENCES "cuotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuario_cajero_id_fkey" FOREIGN KEY ("usuario_cajero_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_whatsapp_log" ADD CONSTRAINT "mensajes_whatsapp_log_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_whatsapp_log" ADD CONSTRAINT "mensajes_whatsapp_log_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_whatsapp_log" ADD CONSTRAINT "mensajes_whatsapp_log_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

