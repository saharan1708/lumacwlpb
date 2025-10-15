import { readBlockConfig, createOptimizedPicture } from '../../scripts/aem.js';

const GQL_BASE = 'https://publish-p168578-e1802821.adobeaemcloud.com/graphql/execute.json/Lumacrosswalk/menproductspagelister';

function buildCard(item) {
  const { name, image = {}, category = [] } = item || {};
  const imgUrl = image?._publishUrl || image?._dynamicUrl || image?._authorUrl || '';

  const card = document.createElement('article');
  card.className = 'cpl-card';

  const picture = imgUrl ? createOptimizedPicture(imgUrl, name || 'Product image', false, [
    { media: '(min-width: 900px)', width: '600' },
    { media: '(min-width: 600px)', width: '400' },
    { width: '320' },
  ]) : null;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'cpl-card-media';
  if (picture) imgWrap.append(picture);

  const meta = document.createElement('div');
  meta.className = 'cpl-card-meta';
  const categoryText = (category && category.length) ? category.join(', ') : '';
  const cat = document.createElement('p');
  cat.className = 'cpl-card-category';
  cat.textContent = categoryText.replaceAll('luma:', '').replaceAll('/', ', ');
  const title = document.createElement('h3');
  title.className = 'cpl-card-title';
  title.textContent = name || '';
  meta.append(cat, title);

  card.append(imgWrap, meta);
  return card;
}

async function fetchProducts(path) {
  try {
    if (!path) return [];
    const url = new URL(GQL_BASE);
    url.searchParams.set('_path', path);
    const resp = await fetch(url.href, { method: 'GET' });
    const json = await resp.json();
    return json?.data?.productsModelList?.items || [];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Category Products Lister: fetch error', e);
    return [];
  }
}

function renderHeader(container, selectedTags) {
  if (!selectedTags || selectedTags.length === 0) return;
  const wrap = document.createElement('div');
  wrap.className = 'cpl-tags';
  const list = Array.isArray(selectedTags) ? selectedTags : `${selectedTags}`.split(',');
  list.map((t) => `${t}`.trim()).filter(Boolean).forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'cpl-tag';
    chip.textContent = tag;
    wrap.append(chip);
  });
  container.append(wrap);
}

export default async function decorate(block) {
  // Extract folder path from Universal Editor authored markup
  let folderHref = block.querySelector('a[href]')?.href 
    || block.querySelector('a[href]')?.textContent?.trim() 
    || '';

  // Also try readBlockConfig as fallback for document-based authoring
  const cfg = readBlockConfig(block);
  if (!folderHref) {
    folderHref = cfg?.folder || cfg?.reference || cfg?.path || '';
  }

  // Normalize folder path to pathname if an absolute URL is provided
  try {
    if (folderHref && folderHref.startsWith('http')) {
      const u = new URL(folderHref);
      folderHref = u.pathname;
    }
  } catch (e) { /* ignore */ }

  // Extract tags - for Universal Editor they'll be in data attributes
  const tags = block.dataset?.['cqTags'] || cfg?.tags || cfg?.['cq:tags'] || '';

  // Clear author table
  block.innerHTML = '';

  renderHeader(block, tags);

  const grid = document.createElement('div');
  grid.className = 'cpl-grid';
  block.append(grid);

  const items = await fetchProducts(folderHref);
  if (!items || items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'cpl-empty';
    empty.textContent = 'No products found.';
    grid.append(empty);
    return;
  }

  const cards = items.map(buildCard);
  grid.append(...cards);
}


