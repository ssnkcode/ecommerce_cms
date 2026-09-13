import os
import requests
import subprocess
import time
import re
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright

print("CONFIGURACION DE IMAGENES")
width = input("Ancho deseado (px): ").strip()
height = input("Alto deseado (px): ").strip()
IMAGE_SIZE = f"{width}x{height}"

url_input = input("URL de la pagina web: ").strip()

QUALITY = 85
OUTPUT_DIR = "downloaded_images"
MAX_DEPTH = 3
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}
IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff')


def is_image_url(url):
    parsed = urlparse(url)
    path = parsed.path.lower()
    return any(path.endswith(ext) for ext in IMAGE_EXTENSIONS)


def extract_all_images(url, page):
    images = set()

    img_elements = page.query_selector_all('img')
    for img in img_elements:
        for attr in ('src', 'data-src', 'data-lazy-src', 'data-original', 'data-zoom-image'):
            val = img.get_attribute(attr)
            if val and val.strip():
                full_url = urljoin(url, val.strip())
                images.add(full_url)

        srcset = img.get_attribute('srcset')
        if srcset:
            for part in srcset.split(','):
                part = part.strip().split(' ')[0]
                if part:
                    images.add(urljoin(url, part))

    source_elements = page.query_selector_all('source')
    for source in source_elements:
        srcset = source.get_attribute('srcset')
        if srcset:
            for part in srcset.split(','):
                part = part.strip().split(' ')[0]
                if part:
                    images.add(urljoin(url, part))

    a_elements = page.query_selector_all('a[href]')
    for a in a_elements:
        href = a.get_attribute('href')
        if href and is_image_url(urljoin(url, href)):
            images.add(urljoin(url, href))

    meta_elements = page.query_selector_all('meta[property="og:image"], meta[name="og:image"], meta[property="twitter:image"], meta[name="twitter:image"]')
    for meta in meta_elements:
        content = meta.get_attribute('content')
        if content:
            images.add(urljoin(url, content))

    style_elements = page.query_selector_all('[style]')
    for el in style_elements:
        style = el.get_attribute('style') or ''
        bg_matches = re.findall(r'url\(["\']?([^"\')]+)["\']?\)', style)
        for match in bg_matches:
            images.add(urljoin(url, match))

    background_images = page.evaluate("""
        () => {
            const imgs = new Set();
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                const style = window.getComputedStyle(el);
                const bgImage = style.backgroundImage;
                if (bgImage && bgImage !== 'none') {
                    const matches = bgImage.match(/url\\(["']?([^"')]+)["']?\\)/g);
                    if (matches) {
                        for (const m of matches) {
                            const url = m.replace(/url\\(["']?/, '').replace(/["']?\\)/, '');
                            imgs.add(url);
                        }
                    }
                }
            }
            return Array.from(imgs);
        }
    """)
    for bg in background_images:
        if bg.startswith('http') or bg.startswith('//'):
            images.add(urljoin(url, bg))

    lazy_images = page.evaluate("""
        () => {
            const imgs = new Set();
            const allElements = document.querySelectorAll('[data-bg], [data-background], [data-image], [data-src]');
            for (const el of allElements) {
                for (const attr of ['data-bg', 'data-background', 'data-image', 'data-src']) {
                    const val = el.getAttribute(attr);
                    if (val) imgs.add(val);
                }
            }
            return Array.from(imgs);
        }
    """)
    for lazy in lazy_images:
        images.add(urljoin(url, lazy))

    return images


def extract_links(url, page):
    links = set()
    base_domain = urlparse(url).netloc

    a_elements = page.query_selector_all('a[href]')
    for a in a_elements:
        href = a.get_attribute('href')
        if not href:
            continue
        full_url = urljoin(url, href)
        parsed = urlparse(full_url)

        if parsed.netloc == base_domain:
            clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            if not any(clean_url.endswith(ext) for ext in ('.pdf', '.zip', '.mp4', '.mp3', '.css', '.js', '.ico')):
                links.add(clean_url)

    return links


def scroll_through_page(page, max_passes=8):
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(0.8)

    for _ in range(max_passes):
        prev_height = page.evaluate("document.body.scrollHeight")

        for _ in range(30):
            page.evaluate("window.scrollBy(0, window.innerHeight)")
            time.sleep(0.4)

        time.sleep(1.5)

        new_height = page.evaluate("document.body.scrollHeight")
        bottom_reached = page.evaluate("window.innerHeight + window.scrollY >= document.body.scrollHeight - 2")

        if bottom_reached and new_height <= prev_height:
            break

    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(0.5)


def crawl_with_browser(url, visited, all_images, browser, depth=0):
    if depth > MAX_DEPTH:
        return
    if url in visited:
        return

    visited.add(url)
    indent = '  ' * depth
    print(f"{indent}Visitando: {url}")

    try:
        page = browser.new_page()
        page.set_default_timeout(20000)

        page.goto(url, wait_until='load', timeout=30000)

        time.sleep(2)

        scroll_through_page(page)
        time.sleep(2)

        images = extract_all_images(url, page)
        all_images.update(images)
        print(f"{indent}  Encontradas {len(images)} imagenes")

        links = extract_links(url, page)
        print(f"{indent}  Encontrados {len(links)} links internos")

        page.close()

        for link in links:
            crawl_with_browser(link, visited, all_images, browser, depth + 1)

    except Exception as e:
        print(f"{indent}  Error: {e}")
        try:
            page.close()
        except:
            pass


def download_image(url, index):
    try:
        parsed = urlparse(url)
        ext = os.path.splitext(parsed.path)[1].lower()
        if ext not in IMAGE_EXTENSIONS:
            ext = '.jpg'

        filename = f"image_{index:04d}{ext}"
        filepath = os.path.join(OUTPUT_DIR, filename)

        if os.path.exists(filepath):
            print(f"  Ya existe: {filename}")
            return filepath, filename

        response = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        response.raise_for_status()

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return filepath, filename

    except Exception as e:
        print(f"  Error descargando {url}: {e}")
        return None, None


def resize_image(input_path, output_path, size):
    try:
        if os.name == 'nt':
            cmd = f'magick "{input_path}" -resize {size} -quality {QUALITY} "{output_path}"'
        else:
            cmd = f'convert "{input_path}" -resize {size} -quality {QUALITY} "{output_path}"'

        subprocess.run(cmd, shell=True, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  Error redimensionando {input_path}: {e.stderr}")
        return False


def main():
    print("\n" + "=" * 50)
    print(f"Tamano configurado: {IMAGE_SIZE}")
    print(f"URL objetivo: {url_input}")
    print("=" * 50)

    try:
        if os.name == 'nt':
            subprocess.run("magick --version", shell=True, check=True, capture_output=True)
        else:
            subprocess.run("convert --version", shell=True, check=True, capture_output=True)
        print("ImageMagick disponible")
    except:
        print("ImageMagick no encontrado. Instalalo:")
        print("  Windows: choco install imagemagick")
        print("  Mac: brew install imagemagick")
        print("  Linux: sudo apt-get install imagemagick")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    resized_dir = OUTPUT_DIR + "_resized"
    os.makedirs(resized_dir, exist_ok=True)

    visited = set()
    all_images = set()

    print("\nFASE 1: Rastreando pagina con navegador real...")
    print("(Esto puede tardar unos segundos por pagina)\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        crawl_with_browser(url_input, visited, all_images, browser)
        browser.close()

    print(f"\nTotal de imagenes encontradas: {len(all_images)}")

    if not all_images:
        print("No se encontraron imagenes. Saliendo.")
        return

    print("\nFASE 2: Descargando imagenes...")
    results = {'success': 0, 'failed': 0, 'skipped': 0}

    for i, img_url in enumerate(sorted(all_images), 1):
        print(f"\n[{i}/{len(all_images)}] {img_url}")

        filepath, filename = download_image(img_url, i)

        if not filepath:
            results['failed'] += 1
            continue

        output_name = f"resized_{filename}"
        output_path = os.path.join(resized_dir, output_name)

        if os.path.exists(output_path):
            print(f"  Ya redimensionada: {output_name}")
            results['skipped'] += 1
            continue

        print(f"  Redimensionando a {IMAGE_SIZE}...")
        if resize_image(filepath, output_path, IMAGE_SIZE):
            print(f"  Guardada: {output_name}")
            results['success'] += 1
        else:
            results['failed'] += 1

        time.sleep(0.3)

    print("\n" + "=" * 50)
    print("RESUMEN:")
    print(f"  Imagenes redimensionadas: {results['success']}")
    print(f"  Fallidas: {results['failed']}")
    print(f"  Saltadas: {results['skipped']}")
    print(f"  Originales en: {os.path.abspath(OUTPUT_DIR)}")
    print(f"  Redimensionadas en: {os.path.abspath(resized_dir)}")
    print("=" * 50)


if __name__ == "__main__":
    main()
