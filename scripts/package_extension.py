"""Build a deterministic versioned download without including tests or student data."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'extension'
version = json.loads((source / 'manifest.json').read_text())['version']
destination = ROOT / 'docs' / 'downloads'
destination.mkdir(parents=True, exist_ok=True)
archive_path = destination / f'sedna-extension-{version}.zip'
files = [source / name for name in ['manifest.json', 'background.js', 'core.js', 'page.js', 'ui.js', 'index.html', 'style.css', 'README.md', 'vendor/exceljs.min.js', 'vendor/EXCELJS-LICENSE']]
from io import BytesIO
buffer = BytesIO()
with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        info = zipfile.ZipInfo(f'sedna-extension-{version}/{path.relative_to(source).as_posix()}', (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, path.read_bytes())
data = buffer.getvalue()
if archive_path.exists() and archive_path.read_bytes() != data:
    raise SystemExit('Esta versión ya existe con otro contenido. Aumentá version en extension/manifest.json.')
archive_path.write_bytes(data)
releases = []
for path in destination.glob('sedna-extension-*.zip'):
    tag = path.stem.removeprefix('sedna-extension-')
    releases.append({'version': tag, 'file': f'downloads/{path.name}', 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
releases.sort(key=lambda r: tuple(int(n) for n in r['version'].split('.')), reverse=True)
(ROOT / 'docs' / 'versions.json').write_text(json.dumps(releases, indent=2) + '\n')
print(f'Preparado {archive_path.name}: {len(data)} bytes')
