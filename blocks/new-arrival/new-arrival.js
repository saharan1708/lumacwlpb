import { readBlockConfig, createOptimizedPicture } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';

const GQL_BASE = 'https://publish-p168578-e1802821.adobeaemcloud.com/graphql/execute.json/Lumacrosswalk/menproductspagelister';

function buildCard(item, isAuthor) {
  const { id, sku, name, image = {}, category = [] } = item || {};
  let imgUrl = isAuthor ? image?._authorUrl : image?._publishUrl;
  const productId = sku || id || '';

  const card = document.createElement('article');
  card.className = 'na-card';

  // Make card clickable and redirect to product page
  if (productId) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const currentPath = window.location.pathname;
      // Replace the last segment with 'product'
      const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      // On author add .html extension, on publish don't
      const productPath = isAuthor ? `${basePath}/product.html` : `${basePath}/product`;
      window.location.href = `${productPath}?productId=${encodeURIComponent(productId)}`;
    });
  }

  // Handle image display for author vs publish
  let picture = null;
  if (imgUrl) {
    if (!isAuthor && imgUrl.startsWith('http')) {
      // For publish with full URL, use it directly in an img tag
      picture = document.createElement('picture');
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = name || 'Product image';
      img.loading = 'lazy';
      picture.appendChild(img);
    } else {
      // For author or relative paths, use createOptimizedPicture
      picture = createOptimizedPicture(imgUrl, name || 'Product image', false, [
        { media: '(min-width: 900px)', width: '600' },
        { media: '(min-width: 600px)', width: '400' },
        { width: '320' },
      ]);
    }
  }

  const imgWrap = document.createElement('div');
  imgWrap.className = 'na-card-media';
  if (picture) imgWrap.append(picture);

  const meta = document.createElement('div');
  meta.className = 'na-card-meta';
  const categoryText = (category && category.length) ? category.join(', ') : '';
  const cat = document.createElement('p');
  cat.className = 'na-card-category';
  cat.textContent = categoryText.replaceAll('luma:', '').replaceAll('/', ', ');
  const title = document.createElement('h3');
  title.className = 'na-card-title';
  title.textContent = name || '';
  meta.append(cat, title);

  card.append(imgWrap, meta);
  return card;
}

async function fetchProducts(path) {
  try {
    if (!path) return [];
    // For AEM parameterized queries, use semicolon syntax: ;_path=value
    const url = `${GQL_BASE};_path=${path}`;
    const resp = await fetch(url, { method: 'GET' });
    const json = await resp.json();
    return json?.data?.productsModelList?.items || [];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('New Arrival: fetch error', e);
    return [];
  }
}

function filterProductsBySKU(products, skuList) {
  if (!skuList || skuList.length === 0) return products;
  
  // Normalize SKUs to lowercase for case-insensitive matching
  const normalizedSKUs = skuList.map(s => s.toLowerCase().trim());
  
  return products.filter(product => {
    const productSKU = (product.sku || '').toLowerCase().trim();
    return normalizedSKUs.includes(productSKU);
  });
}

function extractSKUs(block, cfg) {
  const skuList = [];
  
  // Try to extract from Universal Editor data attributes
  // With multi: true, the data comes as a string array
  const skusData = block.dataset?.skus;
  if (skusData) {
    try {
      const parsed = JSON.parse(skusData);
      if (Array.isArray(parsed)) {
        // Multi-field returns array of strings directly
        skuList.push(...parsed.filter(Boolean));
      } else if (typeof parsed === 'string' && parsed) {
        // Single value
        skuList.push(parsed);
      }
    } catch (e) {
      // If not JSON, might be comma-separated string
      if (typeof skusData === 'string' && skusData) {
        const skus = skusData.split(',').map(s => s.trim()).filter(Boolean);
        skuList.push(...skus);
      }
    }
  }
  
  // Fallback: Try to extract from block config (document-based authoring)
  // Look for rows with SKU values
  if (skuList.length === 0 && cfg) {
    if (cfg.skus) {
      const skusValue = cfg.skus;
      if (Array.isArray(skusValue)) {
        skuList.push(...skusValue.filter(Boolean));
      } else if (typeof skusValue === 'string') {
        const skus = skusValue.split(',').map(s => s.trim()).filter(Boolean);
        skuList.push(...skus);
      }
    }
    
    // Also check for other SKU-related keys
    Object.keys(cfg).forEach(key => {
      if (key.toLowerCase().includes('sku') && key !== 'skus') {
        const value = cfg[key];
        if (value) {
          const skus = value.split(',').map(s => s.trim()).filter(Boolean);
          skuList.push(...skus);
        }
      }
    });
  }
  
  // Another fallback: parse table rows manually
  if (skuList.length === 0) {
    const rows = block.querySelectorAll(':scope > div');
    rows.forEach(row => {
      const cells = row.querySelectorAll(':scope > div');
      cells.forEach(cell => {
        const text = cell.textContent.trim();
        if (text && !text.toLowerCase().includes('folder') && !text.startsWith('http')) {
          skuList.push(text);
        }
      });
    });
  }
  
  return skuList;
}

function createCarousel(block, cards) {
  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'na-carousel-wrapper';
  
  const carousel = document.createElement('div');
  carousel.className = 'na-carousel';
  
  const track = document.createElement('div');
  track.className = 'na-carousel-track';
  
  cards.forEach(card => track.append(card));
  carousel.append(track);
  
  // Create navigation buttons
  const prevBtn = document.createElement('button');
  prevBtn.className = 'na-carousel-btn na-carousel-btn-prev';
  prevBtn.setAttribute('aria-label', 'Previous');
  prevBtn.innerHTML = '‹';
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'na-carousel-btn na-carousel-btn-next';
  nextBtn.setAttribute('aria-label', 'Next');
  nextBtn.innerHTML = '›';
  
  carouselWrapper.append(prevBtn, carousel, nextBtn);
  block.append(carouselWrapper);
  
  // Carousel navigation logic
  let currentIndex = 0;
  const cardWidth = 320; // Base card width + gap
  const visibleCards = getVisibleCards();
  
  function getVisibleCards() {
    const width = window.innerWidth;
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
  }
  
  function updateCarousel() {
    const maxIndex = Math.max(0, cards.length - visibleCards);
    currentIndex = Math.max(0, Math.min(currentIndex, maxIndex));
    
    const offset = -currentIndex * cardWidth;
    track.style.transform = `translateX(${offset}px)`;
    
    // Update button states
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIndex;
  }
  
  prevBtn.addEventListener('click', () => {
    currentIndex = Math.max(0, currentIndex - 1);
    updateCarousel();
  });
  
  nextBtn.addEventListener('click', () => {
    const maxIndex = Math.max(0, cards.length - visibleCards);
    currentIndex = Math.min(maxIndex, currentIndex + 1);
    updateCarousel();
  });
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateCarousel();
    }, 200);
  });
  
  // Initial update
  updateCarousel();
}

export default async function decorate(block) {
  // Check if we're in author environment
  const isAuthor = isAuthorEnvironment();

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

  // Remove .html extension if present (Universal Editor adds it)
  if (folderHref && folderHref.endsWith('.html')) {
    folderHref = folderHref.replace(/\.html$/, '');
  }

  // Extract SKUs from multifield
  const skuList = extractSKUs(block, cfg);

  // Clear author table
  block.innerHTML = '';

  // Add header
  const header = document.createElement('div');
  header.className = 'na-header';
  const title = document.createElement('h2');
  title.className = 'na-title';
  title.textContent = 'New Arrivals';
  header.append(title);
  block.append(header);

  // Fetch all products
  const allProducts = await fetchProducts(folderHref);
  
  if (!allProducts || allProducts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'na-empty';
    empty.textContent = 'No products found.';
    block.append(empty);
    return;
  }

  // Filter products by SKU
  const filteredProducts = filterProductsBySKU(allProducts, skuList);
  
  if (filteredProducts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'na-empty';
    empty.textContent = 'No matching products found for the specified SKUs.';
    block.append(empty);
    return;
  }

  // Build cards
  const cards = filteredProducts.map((item) => buildCard(item, isAuthor));
  
  // Create carousel
  createCarousel(block, cards);
}

