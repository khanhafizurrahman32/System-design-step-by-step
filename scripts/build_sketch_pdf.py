"""Combine all sketchnotes into one landscape PDF, one topic per page, with bookmarks.
Usage: python scripts/build_sketch_pdf.py   (needs playwright, pypdf)"""
import asyncio, io, pathlib, re
from pypdf import PdfReader, PdfWriter
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]
SK = ROOT / 'docs' / 'sketchnotes'
OUT = ROOT / 'docs' / 'downloads' / 'sketchnotes.pdf'
ORDER = [('Start here', 'interview'), ('Staff level', 'staff-'), ('Problems', 'problem-'), ('Patterns', 'pattern-'), ('Core concepts', 'concept-'), ('DDIA chapters', 'ddia-')]
async def main():
    w = PdfWriter()
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        for group, pre in ORDER:
            files = sorted(f for f in SK.glob(pre + '*.svg'))
            parent = w.add_outline_item(group, len(w.pages))
            for f in files:
                svg = f.read_text()
                title = re.search(r'<title>(.*?): sketchnote</title>', svg).group(1).replace('&amp;', '&')
                await pg.set_content(f'<html><body style="margin:0">{svg}</body></html>')
                await pg.wait_for_timeout(150)
                pdf = await pg.pdf(width='2000px', height='1414px', print_background=True, page_ranges='1')
                w.add_outline_item(title, len(w.pages), parent=parent)
                w.append(PdfReader(io.BytesIO(pdf)))
        await b.close()
    w.compress_identical_objects(remove_identicals=True, remove_orphans=True)
    w.add_metadata({'/Title': 'System Design, Step by Step: Sketchnotes'})
    with open(OUT, 'wb') as fh: w.write(fh)
    print(f'wrote {OUT} ({OUT.stat().st_size/1e6:.1f} MB, {len(w.pages)} pages)')
asyncio.run(main())
