# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, ListFlowable, ListItem
)
from reportlab.lib.styles import ParagraphStyle

OUTPUT = r"F:\upc\cms\auditoria_mejoras.pdf"

# ---- Colores de la paleta (grises, coherentes con el proyecto) ----
DARK = colors.HexColor("#1a1f2e")
MUTED = colors.HexColor("#5a6478")
ACCENT = colors.HexColor("#8a8a8a")       # gris primary
ACCENT_DARK = colors.HexColor("#6f6f6f")
GOOD = colors.HexColor("#2b8a3e")         # verde: ya implementado
WARN = colors.HexColor("#b45309")         # naranja: a ajustar / refactorizar
BAD = colors.HexColor("#b3261e")          # rojo: prioridad alta / falta
HIGHLIGHT_BG = colors.HexColor("#fff3b0") # amarillo resaltado
SOFT_BG = colors.HexColor("#eef1f7")

# ---- Estilos ----
title_style = ParagraphStyle(
    "Title", fontName="Helvetica-Bold", fontSize=22, leading=27,
    textColor=DARK, spaceAfter=2,
)
subtitle_style = ParagraphStyle(
    "Subtitle", fontName="Helvetica", fontSize=12, leading=16,
    textColor=MUTED, spaceAfter=6,
)
section_style = ParagraphStyle(
    "Section", fontName="Helvetica-Bold", fontSize=15, leading=19,
    textColor=colors.white, spaceBefore=16, spaceAfter=8,
    backColor=ACCENT_DARK, borderPadding=(6, 8, 6, 8), borderRadius=6,
)
bullet_style = ParagraphStyle(
    "Bullet", fontName="Helvetica", fontSize=10.5, leading=15,
    textColor=DARK, spaceAfter=2,
)
sub_style = ParagraphStyle(
    "Sub", fontName="Helvetica-Oblique", fontSize=9.5, leading=13,
    textColor=MUTED, leftIndent=16, spaceAfter=6,
)
highlight_style = ParagraphStyle(
    "Highlight", parent=sub_style, backColor=HIGHLIGHT_BG,
    borderColor=colors.HexColor("#f5c518"), borderWidth=0.8,
    borderPadding=(3, 6, 3, 6), borderRadius=4,
)
rec_style = ParagraphStyle(
    "Rec", fontName="Helvetica-Bold", fontSize=10.5, leading=15,
    textColor=DARK, leftIndent=14, spaceBefore=8, spaceAfter=2,
)
rec_body = ParagraphStyle(
    "RecBody", fontName="Helvetica", fontSize=10.5, leading=15,
    textColor=DARK, leftIndent=14, borderPadding=(4, 8, 4, 8),
)

# Nota: reportlab no soporta color de fondo en párrafos largos con saltos de línea de forma
# fiable, así que usamos backColor por párrafo corto donde sea necesario.

def h(text):  # resaltado: texto en negrita y color de acento
    return f'<font color="#b45309"><b>{text}</b></font>'

def green(text):
    return f'<font color="#2b8a3e"><b>[YA IMPLEMENTADO]</b></font>'

def orange(text):
    return f'<font color="#b45309"><b>[A AJUSTAR / REFACTORIZAR]</b></font>'

def red(text):
    return f'<font color="#b3261e"><b>[PRIORIDAD ALTA]</b></font>'

story = []

story.append(Paragraph("Auditoría de Mejoras — Frontend", title_style))
story.append(Paragraph("Proyecto Commerce CMS · catálogo público + panel admin · 28/08/2026", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1.2, color=ACCENT_DARK, spaceAfter=8))
story.append(Paragraph(
    "Informe de <b>auditoría de mejoras</b> basado en el código real del frontend "
    "(React + Vite). Se listan: lo <b>ya aplicado</b>, lo que <b>falta</b>, y lo que hay que "
    "<b>refactorizar</b> para dejar la página perfecta. En cada punto se indica impacto.",
    ParagraphStyle("Intro", parent=bullet_style, fontName="Helvetica", spaceAfter=4),
))
story.append(Paragraph(
    "Leyenda de colores: " + green("ya implementado") + " · " + orange("ajustar/refactorizar") +
    " · " + red("prioridad alta / falta") + " · " + h("resaltado = mayor recomendación") + ".",
    ParagraphStyle("Legend", parent=sub_style, fontName="Helvetica", spaceAfter=4),
))
story.append(HRFlowable(width="100%", thickness=0.8, color=ACCENT, spaceBefore=6, spaceAfter=2))

# =========================================================
# 1) YA IMPLEMENTADO
# =========================================================
story.append(Paragraph("1. Mejoras ya implementadas en el frontend", section_style))

done_items = [
    "Carrito completo (drawer lateral, cantidades, eliminar, vaciar, total, persistencia en localStorage).",
    "Checkout por WhatsApp con mensaje de pedido (título, cantidad, subtotal, total y pie de reserva).",
    "Lazy loading en imágenes de la grilla, carrito y miniaturas de la galería del modal.",
    "Reserva de espacio con width/height + aspect-ratio en tarjetas y carrito (evita CLS).",
    "Accesibilidad del switch de tema: aria-label descriptivo y aria-pressed (catálogo y CMS).",
    "Paleta de colores unificada entre CMS y catálogo en modo claro (grises y navbar/footer oscuros).",
    "Cierre con tecla Escape del carrito y de los modales.",
    "Favicon SVG de carrito en catálogo y CMS.",
    "Hero editable e imagen de fondo dinámica con control de tamaño desde el CMS.",
    "Sincronización de datos entre pestañas mediante eventos storage/focus/visibilitychange.",
]
for it in done_items:
    story.append(Paragraph("• " + it, bullet_style))

# =========================================================
# 2) REFACTORIZAR / DEUDA TÉCNICA
# =========================================================
story.append(Paragraph("2. Refactorizar / deuda técnica", section_style))

ref_items = [
    ("Datos en localStorage sin validación de esquema ni migraciones.",
     "Si cambia el esquema (ej. nuevo campo) el JSON guardado puede romper el render. Falta validar tipos al leer y una estrategia de versionado."),
    ("Credenciales admin hardcodeadas en el bundle del cliente (admin / admin123).",
     "Se ven en el código fuente del navegador. El panel no está protegido a nivel de ruta: /cms/ es accesible sin login. A resolver con el backend."),
    ("Lógica de datos duplicada entre CMS (App.jsx) y catálogo (CatalogApp.jsx).",
     "Ambos leen/escriben el mismo STORAGE_KEY y redefinen defaults. Conviene extraer un módulo común (utils/datos) para no duplicar."),
    ("Código JSX de fragmentos de UI mezclado en componentes grandes.",
     "CatalogApp concentra navbar, hero, carrito, login y modales. Refactorizar en componentes separados mejora el mantenimiento."),
    ("Íconos y estados representados solo con emojis en varias partes (tarjetas vacías, categorías).",
     "Reemplazar por SVG/componentes con aria-hidden y texto alt para mejor accesibilidad y consistencia visual."),
    ("Estilos CSS muy largos y con valores mágicos de color repetidos en varios puntos.",
     "Consolidar variables CSS (ya existe :root) y tokens de color para no repetir hex en media queries y estados."),
]
for title, body in ref_items:
    story.append(Paragraph("• <b>" + title + "</b>", bullet_style))
    story.append(Paragraph(body, sub_style))

# =========================================================
# 3) FALTA / PENDIENTE (prioridad)
# =========================================================
story.append(Paragraph("3. Pendiente de implementar", section_style))

pending_groups = [
    ("3.1 UX y funcionalidad de catálogo", [
        "No hay buscador ni filtro por categoría → dificultad para encontrar productos al crecer el stock.",
        "No hay paginación ni carga infinita → la grilla crece sin control con muchos productos.",
        "No hay feedback de carga (skeleton/spinner) al leer datos → el usuario puede creer que está vacío.",
        "No hay página individual de producto con URL propia → imposible compartir/enlazar un producto concreto.",
        "No hay botones de compartir producto por WhatsApp/redes.",  # importante para negocio por WhatsApp
    ]),
    ("3.2 SEO y rendimiento", [
        "Faltan meta description y Open Graph en el HTML (solo favicon). Mejorar indexación y vistas previas.",
        "Imágenes sin conversión a WebP/AVIF → reducen tamaño; aplicable sobre todo a fotos grandes subidas desde el CMS.",
        "No hay precarga (preload) de recursos críticos; con fuentes de sistema no es urgente pero se puede optimizar.",
        "No hay cacheado de imágenes ni lazy en la imagen del hero (se carga siempre al inicio).",
    ]),
    ("3.3 Accesibilidad (A11y)", [
        "Falta skip-link para saltar al contenido principal (lectores de pantalla y teclado).",
        "Navegación por teclado incompleta: no hay focus trap en carrito/menú; el foco puede escaparse del modal.",
        "Algunos botones son solo emoji sin aria-label (p. ej. vaciado de carrito, thumbs de galería q ya tienen).",
        "Contraste mejorable en alguno textos muted en modo claro.",
    ]),
    ("3.4 Seguridad de la interfaz", [
        "Backend pendiente: mover autenticación, validación y persistencia al servidor.",
        "No hay límite de intentos de login ni tokens de sesión (se resuelve con backend).",
        "Validación de entrada en formularios del CMS (longitud, tipos de archivo) del lado cliente.",
    ]),
]

for group, items in pending_groups:
    story.append(Paragraph(group, rec_style))
    for it in items:
        story.append(Paragraph("  • " + it, bullet_style))

# =========================================================
# 4) MEJORAS PRIORITARIAS PARA DEJAR LA PÁGINA PERFECTA
# =========================================================
story.append(Paragraph("4. Mejoras críticas para dejar la página perfecta", section_style))

critical = [
    ("Responsividad total desde 290px que se adapte a todas las pantallas.",
     "Revisar todos los breakpoints (290/420/520/640/900/1200) para que no haya desbordes, textos cortados ni grid roto en dispositivos muy angostos. Es la mejora más demandada."),
    ("Menú hamburguesa en el navbar para tablets y celulares.",
     "Actualmente el navbar del catálogo usa botones fijos y el del CMS hace flex-wrap. Implementar un botón hamburguesa que despliegue ADMIN, tema y (en CMS) las acciones, con cierre por Escape y overlay."),
    ("Vista previa en vivo desde el CMS.",
     "El CMS guarda cambios en localStorage pero para verlos el usuario tiene que abrir el catálogo. Un panel de previsualización real mejoraría el flujo."),
    ("Optimización de imágenes (WebP/AVIF + dimensiones).",
     "Convertir las fotos subidas a WebP y definir width/height (ya reservado el espacio con aspect-ratio) para reducir el peso y mejorar LCP."),
]

for title, body in critical:
    story.append(Paragraph("★ <b>" + title + "</b>", rec_style))
    story.append(Paragraph(body, sub_style))

# =========================================================
# Resumen final
# =========================================================
story.append(Spacer(1, 8))
story.append(HRFlowable(width="100%", thickness=1.2, color=ACCENT_DARK))
story.append(Paragraph(
    "Prioridad sugerida: 1) Responsividad 290px + menú hamburguesa, 2) optimización de imágenes "
    "(WebP/CLS), 3) accesibilidad (skip-link + focus trap + back-end de autenticación), "
    "4) buscador/filtros y feedback de carga. El backend resolverá el bloqueo de seguridad "
    "de credenciales y la persistencia definitiva.",
    ParagraphStyle("End", parent=bullet_style, fontName="Helvetica-Bold",
                   textColor=ACCENT_DARK, backColor=SOFT_BG,
                   borderPadding=(6, 8, 6, 8), borderRadius=4),
))

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    rightMargin=20 * mm, leftMargin=20 * mm,
    topMargin=20 * mm, bottomMargin=20 * mm,
    title="Auditoría de Mejoras — Frontend",
    author="Auditoría automatizada",
)
doc.build(story)

print(f"OK -> {OUTPUT}")
