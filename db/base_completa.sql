-- ============================================================================
--  COMMERCE CMS - BASE DE DATOS COMPLETA (PostgreSQL 14+)
--  ----------------------------------------------------------------------------
--  Script único con TODAS las tablas que usa el backend del panel CMS +
--  catálogo. No le falta nada:
--
--    cms_settings         -> ajustes del sitio (nombre, hero, logo, whatsapp,
--                            categorías, exportación PDF) como clave:valor.
--    cms_admins           -> usuarios del panel (contraseña en hash bcrypt).
--    cms_sessions         -> sesiones de login (token hash, nunca el token).
--    cms_login_attempts   -> bloqueo de seguridad: 3 intentos fallidos = 10 min.
--    products             -> productos con imágenes, galería, precios y specs.
--
--  ESTE ARCHIVO CUBRE LOS DOS SQL ANTERIORES (sql/cms.sql + sql/catalogo.sql),
--  unificándolos en uno solo dentro de db/.
--
--  CÓMO EJECUTARLO:
--      psql -U postgres -h localhost -f db/base_completa.sql
--
--  O creando la base manualmente una vez y luego:
--      psql -U postgres -h localhost -d commerce_cms -f db/base_completa.sql
--
--  Credenciales del admin inicial:  admin / admin123
-- ============================================================================

-- ----------------------------------------------------------------------------
--  0) CREAR LA BASE DE DATOS (si no existe)
--     \gexec ejecuta el resultado del SELECT como SQL -> crea la base.
--     Después nos conectamos a ella.
--
--     El nombre de la base sale de la variable de entorno DBNAME si está
--     seteada (útil para testear instalación limpia en otra base), si no usa
--     el valor por defecto: commerce_cms.
-- ----------------------------------------------------------------------------
\getenv dbname DBNAME
\if :{?dbname}
\else
    \set dbname commerce_cms
\endif

SELECT 'CREATE DATABASE ' || quote_ident(:'dbname')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'dbname')\gexec

\connect :dbname

-- ----------------------------------------------------------------------------
--  1) AJUSTES GENERALES DEL SITIO (cms_settings)
--     Clave -> valor JSONB para aceptar cualquier campo nuevo sin ALTER.
--     Claves en snake_case = nombres de columnas del backend (KEY_MAP).
--     Las claves extra del frontend (categories, pdf*) se guardan con su
--     nombre JS tal cual, como las envía el CMS.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_settings (
    id          SERIAL PRIMARY KEY,
    key         TEXT        NOT NULL UNIQUE,
    value       JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE cms_settings IS
    'Ajustes del sitio (nombre, hero, logo, whatsapp, categorías, PDF). Clave -> valor JSONB.';

-- Datos iniciales: mismos valores que usa el backend (storage.mjs) y el frontend.
INSERT INTO cms_settings (key, value) VALUES
    -- Mapeados por KEY_MAP (claves snake_case)
    ('site_name',        '"SsnkCode"'),
    ('tagline',          '"Mirá nuestro catálogo online y consegui precios exclusivos **HOY MISMO**!!!"'),
    ('hero_title',       '"Variedad, calidad y los mejores precios para tu día a día"'),
    ('products_title',   '"Nuestros productos"'),
    ('hero_text_color',  '""'),
    ('hero_image',       '""'),
    ('hero_image_size',  '420'),
    ('logo',             '""'),
    ('logo_size',        '64'),
    ('whatsapp',         '"543541682310"'),
    ('whatsapp_footer',  '"SOLO SE RESERVA CON SEÑA DEL 50% PREVIA!\nSaludos desde polirrubroSSNK!!!"'),
    -- No mapeados por KEY_MAP (se guardan con el nombre JS que envía el CMS)
    ('categories',       '["Audio", "Vestibles", "Accesorios", "Pantallas"]'),
    ('pdfBusinessName',  '""'),
    ('pdfListMode',      '"compact"'),
    ('pdfShowImages',    'true'),
    ('pdfShowDate',      'true'),
    ('pdfGroupByCategory', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Limpia claves que ya no existen en el proyecto (p. ej. el viejo hero_subtitle).
DELETE FROM cms_settings WHERE key = 'hero_subtitle';

-- ----------------------------------------------------------------------------
--  2) ADMINISTRADORES (cms_admins)
--     El hash bcrypt abajo corresponde a la contraseña: admin123
--     (generado con bcryptjs, la misma librería del backend).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_admins (
    id            SERIAL PRIMARY KEY,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE cms_admins IS
    'Usuarios administradores del panel. La contraseña es un hash bcrypt (nunca texto plano).';

INSERT INTO cms_admins (username, password_hash) VALUES
    (
        'admin',
        '$2b$10$kkMc5503JoWTlW7RTbNUkeqX/s.TLSBa3XbSxbvUpICI4s/vaSA.a'
    )
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ----------------------------------------------------------------------------
--  3) SESIONES (cms_sessions)
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
    'Sesiones activas. Se guarda el hash del token de la cookie (no el token).';

-- ----------------------------------------------------------------------------
--  4) INTENTOS DE LOGIN (cms_login_attempts)
--     Bloqueo de seguridad: tras 3 intentos fallidos consecutivos (field
--     failed_count >= 3) la cuenta queda bloqueada hasta locked_until
--     (ahora + 10 minutos por defecto). Un login exitoso borra la fila.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_login_attempts (
    username      TEXT        PRIMARY KEY,
    failed_count  INTEGER     NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
    locked_until  TIMESTAMPTZ NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE cms_login_attempts IS
    'Control de intentos fallidos de login por usuario (3 fallos = bloqueo de 10 min).';

-- ----------------------------------------------------------------------------
--  5) PRODUCTOS (products)
--     El CMS los administra; el catálogo los lee. Guarda imagen principal,
--     galería (JSONB de URLs), precios y especificaciones.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id          BIGSERIAL       PRIMARY KEY,
    title       TEXT            NOT NULL,
    description TEXT            NOT NULL DEFAULT '',
    price       NUMERIC(16, 2)  NOT NULL CHECK (price >= 0),
    category    TEXT            NOT NULL DEFAULT '',
    image       TEXT            NOT NULL DEFAULT '',
    gallery     JSONB           NOT NULL DEFAULT '[]'::jsonb,
    specs       TEXT            NOT NULL DEFAULT '',
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products (is_active);

COMMENT ON TABLE products IS
    'Productos del catálogo: imagen, galería, precios, categoría y especificaciones.';

-- Mantener updated_at al día ante cualquier UPDATE de producto.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_touch ON products;
CREATE TRIGGER trg_products_touch
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ----------------------------------------------------------------------------
--  6) DATOS INICIALES - PRODUCTOS (seed, 6 productos del catálogo actual)
--     Se insertan SOLO si la tabla está vacía (para no duplicar si ya hay
--     productos cargados; el seed no toca los datos existentes).
-- ----------------------------------------------------------------------------
INSERT INTO products (title, description, price, category, specs)
SELECT t.*
FROM (
    VALUES
        (
            'Auriculares Pro',
            'Sonido envolvente con cancelación de ruido activa.',
            89,
            'Audio',
            'Cancelación de ruido activa\nBluetooth 5.3\nBatería 40 h\nCarga USB-C\nPeso 250 g'
        ),
        (
            'Smartwatch Series X',
            'Monitor de salud y notificaciones en tu muñeca.',
            199,
            'Vestibles',
            'Pantalla AMOLED 1.4"\nResistente al agua 5 ATM\nGPS integrado\nBatería 14 días\nSensor de frecuencia cardíaca'
        ),
        (
            'Teclado Mecánico',
            'Switches táctiles y retroiluminación RGB.',
            59,
            'Accesorios',
            'Switches mecánicos rojos\nRetroiluminación RGB\nLayout 60%\nInalámbrico 2.4GHz\nBatería 2000 mAh'
        ),
        (
            'Mouse Gamer',
            '16.000 DPI, 8 botones programables.',
            39,
            'Accesorios',
            'Sensor 16.000 DPI\n8 botones programables\nIluminación RGB\nCable paracord\nPeso 65 g'
        ),
        (
            'Monitor 27" 4K',
            'Colores precisos ideales para diseño y gaming.',
            349,
            'Pantallas',
            'Panel IPS UHD 4K\nTasa de refresco 60Hz\nCobertura 98% DCI-P3\nHDR10\n2x HDMI, 1x DisplayPort'
        ),
        (
            'Cámara Web HD',
            '1080p con corrección de luz automática.',
            79,
            'Accesorios',
            'Resolución 1080p/60fps\nCorrección de luz automática\nMicrófonos duales\nCobertura de privacidad\nFijación para trípode'
        )
) AS t (title, description, price, category, specs)
WHERE NOT EXISTS (SELECT 1 FROM products);

-- ============================================================================
--  RESUMEN FINAL: 5 tablas creadas + seed de settings, admin y productos.
--  Credenciales del panel:  admin / admin123
-- ============================================================================