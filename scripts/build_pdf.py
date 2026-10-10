"""Build the whole handbook as one PDF, in navigation order, with bookmarks.

Usage:  mkdocs build && python scripts/build_pdf.py
Needs:  pip install playwright pypdf pyyaml && playwright install chromium
"""
import asyncio, functools, http.server, io, pathlib, threading, yaml
from pypdf import PdfReader, PdfWriter
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
OUT = ROOT / 'docs' / 'downloads' / 'system-design-step-by-step.pdf'
PORT = 8799

PRINT_CSS = """
.md-header, .md-tabs, .md-sidebar, .md-footer, .md-source-file, .md-content__button, .headerlink { display: none !important; }
.md-main__inner { margin: 0 !important; } .md-content { max-width: none !important; margin: 0 !important; }
.md-typeset { font-size: 10.5pt; } .md-typeset h1 { margin-top: 0; }
.md-typeset img { max-width: 100% !important; break-inside: avoid; }
.md-typeset table:not([class]) { font-size: 8.5pt; display: table; }
details { break-inside: avoid; } details > *:not(summary) { display: block !important; }
pre, .highlight { white-space: pre-wrap !important; word-break: break-all; font-size: 8pt !important; }
"""

def nav_pages(nav, trail=()):
    """Yield (section path, title, md file) in navigation order."""
    for item in nav:
        for title, val in item.items():
            if isinstance(val, str):
                if val.endswith('.md'):
                    yield trail, title, val
            else:
                yield from nav_pages(val, trail + (title,))

def url_for(md):
    p = md[:-3]
    if p == 'index':
        return '/'
    if p.endswith('/index'):
        return '/' + p[:-5]
    return '/' + p + '/'

def cover_html(sections):
    rows = ''.join(f'<li>{s}</li>' for s in sections)
    return f"""<html><head><meta charset="utf-8"><style>
    body{{font-family:Inter,Segoe UI,sans-serif;margin:0;padding:120px 80px;color:#1e1e1e}}
    h1{{font-size:44px;margin:0 0 12px}} p{{font-size:18px;color:#444;max-width:640px;line-height:1.5}}
    ul{{font-size:16px;line-height:1.9;margin-top:40px}} .foot{{position:absolute;bottom:60px;font-size:12px;color:#777}}
    </style></head><body><h1>System Design, Step by Step</h1>
    <p>A free, diagram-first handbook. Every design starts simple, shows where it breaks, and fixes only that.</p>
    <ul>{rows}</ul><div class="foot">Content licensed CC BY-SA 4.0. Diagrams use Excalifont (SIL OFL 1.1).</div></body></html>"""

async def main():
    nav = yaml.safe_load('nav:' + (ROOT / 'mkdocs.yml').read_text().split('\nnav:')[1])['nav']
    pages = list(nav_pages(nav))
    pages = [p for p in pages if p[2] not in ('contributing.md', 'sketchnotes/index.md')]
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
    handler.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    writer = PdfWriter()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page()
        await page.set_content(cover_html([list(i.keys())[0] for i in nav[1:] if list(i.keys())[0] != 'Contributing']))
        writer.append(PdfReader(io.BytesIO(await page.pdf(format='A4'))))
        parents = {}
        for trail, title, md in pages:
            await page.goto(f'http://127.0.0.1:{PORT}{url_for(md)}', wait_until='networkidle')
            await page.add_style_tag(content=PRINT_CSS)
            await page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            pdf = await page.pdf(format='A4', print_background=True, margin={'top': '16mm', 'bottom': '16mm', 'left': '14mm', 'right': '14mm'})
            start = len(writer.pages)
            writer.append(PdfReader(io.BytesIO(pdf)))
            parent = None
            for depth, sec in enumerate(trail):
                key = trail[:depth + 1]
                if key not in parents:
                    parents[key] = writer.add_outline_item(sec, start, parent=parents.get(trail[:depth]))
                parent = parents[key]
            writer.add_outline_item(title, start, parent=parent)
            print(f'{len(writer.pages):4d}  {md}')
        await browser.close()
    srv.shutdown()
    writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)
    writer.add_metadata({'/Title': 'System Design, Step by Step', '/Subject': 'A diagram-first system design handbook'})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, 'wb') as f:
        writer.write(f)
    print(f'wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB, {len(writer.pages)} pages)')

asyncio.run(main())
