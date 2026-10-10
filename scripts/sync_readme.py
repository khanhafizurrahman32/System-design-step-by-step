"""Build README.md (shown on GitHub) from docs/index.md (the site home page), fixing relative links."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
s = (root / 'docs/index.md').read_text()
s = re.sub(r'^---\n.*?\n---\n', '', s, flags=re.S)                       # drop front matter
s = re.sub(r'\]\((?!https?://|#)([^)]+)\)', lambda m: f'](docs/{m.group(1)})', s)  # prefix relative links
s = s.replace('](docs/contributing.md)', '](CONTRIBUTING.md)')
s = s.lstrip() + '\n<!-- Generated from docs/index.md by scripts/sync_readme.py. Edit that file instead. -->\n'
(root / 'README.md').write_text(s)
c = (root / 'docs/contributing.md').read_text()
(root / 'CONTRIBUTING.md').write_text(re.sub(r'^---\n.*?\n---\n', '', c, flags=re.S).lstrip())
print('README.md and CONTRIBUTING.md updated')
