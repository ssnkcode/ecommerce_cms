-- ============================================================================
--  COMMERCE CMS - BASE DE DATOS ÚNICA (PostgreSQL 14+)
--  ----------------------------------------------------------------------------
--  ARCHIVO 2/2 -> catalogo.sql  (PARTE: CATÁLOGO / PRODUCTOS)
--
--  Se ejecuta sobre la MISMA base `commerce_cms` que usó cms.sql (archivo 1/2).
--  Por eso las dos partes están "comunicadas": el panel CMS (parte 1) edita
--  los productos, y el catálogo (esta parte) los sirve.
--
--  Ejecución:
--      npm run db:init   (corre cms.sql y este archivo en orden)
--      o psql -d commerce_cms -f catalogo.sql
-- ============================================================================

-- ============================================================================
-- ========================== INICIO PARTE CATÁLOGO ===========================
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1) PRODUCTOS (tabla compartida entre CMS y catálogo)
--      El CMS la administra; el catálogo (backend propio, a futuro) la lee.
--      Columnas = mismos nombres que usan los componentes JSX del frontend.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    title       TEXT            NOT NULL,
    description TEXT            NOT NULL DEFAULT '',
    price       NUMERIC(10, 2)  NOT NULL CHECK (price >= 0),
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
    'PARTE CATÁLOGO: productos. El panel CMS (cms.sql) los administra por API.';

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
--  2) DATOS INICIALES (seed) - mismos 6 productos del catálogo actual
-- ----------------------------------------------------------------------------
INSERT INTO products (title, description, price, category, specs) VALUES
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
        'Wearables',
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
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ========================== FIN PARTE CATÁLOGO ==============================
-- ============================================================================