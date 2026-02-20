import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const BLOG_DIR = path.resolve('blog');
const OUTPUT_FILE = path.join(BLOG_DIR, 'posts.json');

function toDisplayDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function parseJsonLd($) {
  const scripts = $('script[type="application/ld+json"]');
  for (const script of scripts.toArray()) {
    try {
      const payload = JSON.parse($(script).text().trim());
      const nodes = Array.isArray(payload) ? payload : [payload];
      for (const node of nodes) {
        if (node && (node['@type'] === 'Article' || node['@type'] === 'BlogPosting')) {
          return node;
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }
  return null;
}

function normalizeImageUrl(url) {
  if (!url) return '';
  return url
    .replace('https://virtualecommerceinc.com/spin-wheel-deals/', '')
    .replace(/^\.\.\//, '');
}

async function extractPost(fileName) {
  const fullPath = path.join(BLOG_DIR, fileName);
  const html = await readFile(fullPath, 'utf8');
  const $ = load(html);
  const jsonLd = parseJsonLd($) || {};

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text().trim() ||
    $('h1').first().text().trim();

  const excerpt =
    $('meta[name="description"]').attr('content') ||
    jsonLd.description ||
    $('article p').first().text().trim();

  const dateIso =
    jsonLd.datePublished ||
    $('meta[property="article:published_time"]').attr('content')?.slice(0, 10) ||
    '';

  const firstArticleImage = normalizeImageUrl($('article img').first().attr('src') || '');
  const metadataImage =
    $('meta[property="og:image"]').attr('content') ||
    normalizeImageUrl(jsonLd.image) ||
    '';

  const imageUrlRaw = metadataImage.includes('chew-rope.svg') ? firstArticleImage : (metadataImage || firstArticleImage);

  const imageAlt =
    $('article img').first().attr('alt') ||
    title;

  const weekNumber = Number(fileName.match(/week-(\d{2})\.html$/)?.[1] || 0);

  return {
    weekNumber,
    title,
    datePublished: {
      iso: dateIso,
      display: dateIso ? toDisplayDate(dateIso) : ''
    },
    excerpt,
    url: `blog/${fileName}`,
    imageUrl: imageUrlRaw,
    imageAlt,
    featured: false
  };
}

async function main() {
  const files = await readdir(BLOG_DIR);
  const weekFiles = files
    .filter((name) => /^week-\d{2}\.html$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const posts = [];
  for (const fileName of weekFiles) {
    posts.push(await extractPost(fileName));
  }

  const dated = posts
    .map((post, idx) => ({ post, idx, sortDate: new Date(`${post.datePublished.iso}T00:00:00`).getTime() || 0 }))
    .sort((a, b) => b.sortDate - a.sortDate);

  if (dated.length > 0) {
    dated[0].post.featured = true;
  }

  await writeFile(OUTPUT_FILE, `${JSON.stringify(posts, null, 2)}\n`, 'utf8');
  console.log(`Generated ${posts.length} posts in ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
