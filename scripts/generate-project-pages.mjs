import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = 'https://www.gabibrawl.dev';
const index = JSON.parse(await readFile(path.join(root, 'posts/index.json'), 'utf8'));

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function slugify(value) {
  return value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function processText(text) {
  let html = String(text ?? '').replace(/\n\n/g, '</p><p>');
  html = html.replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

function renderProject(project, id) {
  const slug = slugify(project.title);
  const url = `${site}/project-pages/${slug}/`;
  const description = project.description || project.subtitle || '';
  const image = `${site}/${(project.cardImage || '').replace(/^\//, '')}`;
  const sections = (project.content || []).map(section => `
    <section class="project-section">
      <h2>${escapeHtml(section.heading)}</h2>
      ${section.text ? processText(section.text) : ''}
      ${section.list?.length ? `<ul>${section.list.map(item => `<li>${processText(item)}</li>`).join('')}</ul>` : ''}
      ${section.textAfter ? processText(section.textAfter) : ''}
    </section>`).join('');
  const gallery = project.gallery?.length ? `
    <div class="gallery-strip" aria-label="${escapeHtml(project.title)} project gallery">
      ${project.gallery.map(item => `<a class="gallery-strip-item" href="../../${escapeHtml(item.src)}"><img src="../../${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || item.caption || project.title)}" loading="lazy"><span class="static-gallery-caption">${escapeHtml(item.caption || '')}</span></a>`).join('')}
    </div>` : '';
  const projectLinks = (project.links || []).map(link => `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.text)}</a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(project.metaTitle || `${project.title} | Gabriel Yassin`)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(project.metaTitle || project.title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(project.metaTitle || project.title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${image}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Special+Gothic+Condensed+One&family=Special+Gothic+Expanded+One&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../assets/css/base.css">
  <link rel="stylesheet" href="../../assets/css/components.css">
  <link rel="stylesheet" href="../../assets/css/project-detail.css">
  <link rel="stylesheet" href="../../assets/css/gallery.css">
</head>
<body class="static-project-page">
  <main class="project-detail static-project-detail">
    <header class="project-header">
      <div class="title-block">
        <h1>${escapeHtml(project.title)}</h1>
        ${project.subtitle ? `<p class="project-subtitle">${escapeHtml(project.subtitle)}</p>` : ''}
        ${projectLinks ? `<div class="project-links">${projectLinks}</div>` : ''}
      </div>
    </header>
    ${gallery}
    <article class="project-content">${sections}</article>
    ${project.lastUpdated ? `<p class="project-last-updated">Last updated ${escapeHtml(project.lastUpdated)}</p>` : ''}
    <nav class="static-project-navigation" aria-label="Project navigation">
      <a class="back-link" href="../../">← Back to Portfolio</a>
      <a class="static-project-open" href="../../?post=${encodeURIComponent(id)}">Open this project in the portfolio</a>
    </nav>
  </main>
  <script>window.location.replace("../../?post=${encodeURIComponent(id)}");</script>
</body>
</html>
`.replace(/[ \t]+$/gm, '');
}

for (const entry of index) {
  const project = JSON.parse(await readFile(path.join(root, 'posts', `post${entry.id}.json`), 'utf8'));
  const slug = slugify(project.title);
  const directory = path.join(root, 'project-pages', slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'index.html'), renderProject(project, entry.id));
}
