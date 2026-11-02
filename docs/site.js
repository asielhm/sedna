(async () => {
  try {
    const response = await fetch('versions.json');
    if (!response.ok) return;
    const releases = await response.json();
    if (!Array.isArray(releases) || !releases.length) return;
    const valid = releases.filter(r => /^\d+\.\d+\.\d+$/.test(r.version) && r.file === `downloads/sedna-extension-${r.version}.zip`);
    if (!valid.length) return;
    const latest = document.getElementById('latest');
    latest.href = valid[0].file; latest.textContent = `Descargar versión ${valid[0].version} ↓`;
    document.getElementById('release-list').replaceChildren(...valid.map((release, index) => {
      const article = document.createElement('article'); article.className = 'release';
      const info = document.createElement('div');
      const title = document.createElement('h3'); title.textContent = `Versión ${release.version}${index === 0 ? ' · Más reciente' : ''}`;
      const size = document.createElement('p'); size.textContent = `${(release.bytes / 1024 / 1024).toFixed(1)} MB · ZIP para instalación manual`;
      const details = document.createElement('details'), summary = document.createElement('summary'), hash = document.createElement('code');
      summary.textContent = 'Ver SHA-256'; hash.textContent = release.sha256; details.append(summary, hash);
      info.append(title, size, details);
      const link = document.createElement('a'); link.className = 'button secondary'; link.href = release.file; link.download = ''; link.textContent = 'Descargar ZIP ↓';
      article.append(info, link); return article;
    }));
  } catch { /* The current download remains available without JavaScript or fetch. */ }
})();
