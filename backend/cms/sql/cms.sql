-- ============================================================================
--  COMMERCE CMS - BASE DE DATOS ÚNICA (PostgreSQL 14+)
--  ----------------------------------------------------------------------------
--  Este proyecto usa UNA sola base de datos:  commerce_cms
--  Repartida en DOS archivos para mantener el orden:
--
--      ARCHIVO 1/2 -> cms.sql        (PARTE: ADMINISTRACIÓN / PANEL CMS)
--      ARCHIVO 2/2 -> catalogo.sql   (PARTE: CATÁLOGO / PRODUCTOS)
--
--  Ambos archivos trabajan sobre la MISMA base, así que están "comunicados":
--  el panel CMS escribe settings y productos, y el catálogo los lee.
--
--  CÓMO EJECUTARLO (opción fácil):
--      desde backend/cms:   npm run db:init      (crea la base + corre ambos archivos)
--
--  O manualmente con psql:
--      1) crear la base una sola vez:        CREATE DATABASE commerce_cms;
--      2) psql -d commerce_cms -f cms.sql
--      3) psql -d commerce_cms -f catalogo.sql
--
--  INSTRUCCIONES DE EJECUCIÓN:
--  Este archivo NO crea la base ni se conecta: asume que ya existe.
--  Si lo corrés con `npm run db:init` el orden ya está resuelto.
-- ============================================================================

-- ============================================================================
-- =========================== INICIO PARTE CMS ===============================
-- ========================= (Administración del panel) =======================
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1) AJUSTES GENERALES DEL SITIO (settings)
--     Guardados como clave -> valor (JSONB) para aceptar cualquier campo
--     nuevo sin tener que alterar la tabla.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_settings (
    id          SERIAL PRIMARY KEY,
    key         TEXT        NOT NULL UNIQUE,
    value       JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE cms_settings IS
    'PARTE CMS: ajustes del sitio (nombre, hero, whatsapp, logo, etc.). Los lee el catálogo.';

-- Datos iniciales: mismos valores por defecto que usa el frontend
-- (utils/datos.js -> defaultSettings + WHATSAPP_NUMBER/FOOTER).
INSERT INTO cms_settings (key, value) VALUES
    ('site_name',        '"SsnkCode"'),
    ('tagline',          '"Tu tienda de soluciones digitales"'),
    ('hero_title',       '"Soluciones digitales que necesitas, al mejor precio"'),
    ('products_title',   '"Nuestros productos"'),
    ('hero_text_color',  '""'),
    ('hero_image',       '""'),
    ('hero_image_size',  '420'),
    ('logo',             '""'),
    ('logo_size',        '64'),
    ('whatsapp',         '"543541682310"'),
    ('whatsapp_footer',  '"SOLO SE RESERVA CON SEÑA DEL 50% PREVIA!\nSaludos desde polirrubroSSNK!!!"')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
--  2) ADMINISTRADORES (usuarios del panel CMS)
--     La contraseña NUNCA se guarda en texto plano:
--     el backend guarda el hash bcrypt (generado en `npm run db:init`).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_admins (
    id            SERIAL PRIMARY KEY,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE cms_admins IS
    'PARTE CMS: usuarios administradores del panel. La contraseña es un hash bcrypt.';

-- El admin inicial se crea con `npm run db:init` (necesita bcrypt desde Node).

-- ----------------------------------------------------------------------------
--  3) SESIONES (login del panel)
--     El backend emite una cookie httpOnly con un token aleatorio.
--     Acá se guarda SOLO el hash SHA-256 del token (nunca el token real).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_sessions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id     INTEGER     NOT NULL REFERENCES cms_admins(id) ON DELETE CASCADE,
    token_hash   TEXT        NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_cms_sessions_admin   ON cms_sessions (admin_id);
CREATE INDEX IF NOT EXISTS idx_cms_sessions_expires ON cms_sessions (expires_at);

COMMENT ON TABLE cms_sessions IS
    'PARTE CMS: sesiones activas. Se guarda el hash del token de la cookie (no el token).';

-- ============================================================================
-- ============================ FIN PARTE CMS =================================
-- ============================================================================

--  A continuación seguí con el ARCHIVO 2/2 (sql/catalogo.sql)
--  que agrega, sobre la misma base, la parte del catálogo.