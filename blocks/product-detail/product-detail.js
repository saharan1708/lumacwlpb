import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';

const GQL_BASE = 'https://publish-p168578-e1802821.adobeaemcloud.com/graphql/execute.json/Lumacrosswalk/getProductsByPathAndSKU';

/**
 * Get query parameter from URL
 * @param {string} param - Parameter name
 * @returns {string|null} - Parameter value
 */
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * Fetch product details from GraphQL
 * @param {string} path - Content fragment folder path
 * @param {string} sku - Product SKU
 * @returns {Promise<Object|null>} - Product data
 */
async function fetchProductDetail(path, sku) {
  try {
    if (!path || !sku) {
      // eslint-disable-next-line no-console
      console.error('Product Detail: Missing path or SKU');
      return null;
    }
    const url = `${GQL_BASE};_path=${path};sku=${sku}`;
    const resp = await fetch(url, { method: 'GET' });
    const json = await resp.json();
    const items = json?.data?.productsModelList?.items || [];
    return items.length > 0 ? items[0] : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Product Detail: fetch error', e);
    return null;
  }
}

/**
 * Build product detail view
 * @param {Object} product - Product data
 * @param {boolean} isAuthor - Is author environment
 * @returns {HTMLElement} - Product detail container
 */
function buildProductDetail(product, isAuthor) {
  const {
    name, price, category = [], description = {}, image = {}, sku,
  } = product;

  const container = document.createElement('div');
  container.className = 'pd-container';

  // Image section
  const imageSection = document.createElement('div');
  imageSection.className = 'pd-image';

  const imgUrl = isAuthor ? image?._authorUrl : image?._publishUrl;
  if (imgUrl) {
    let picture = null;
    if (!isAuthor && imgUrl.startsWith('http')) {
      // For publish with full URL, use it directly
      picture = document.createElement('picture');
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = name || 'Product image';
      img.loading = 'eager';
      picture.appendChild(img);
    } else {
      // For author or relative paths, use createOptimizedPicture
      picture = createOptimizedPicture(imgUrl, name || 'Product image', true, [
        { media: '(min-width: 900px)', width: '800' },
        { media: '(min-width: 600px)', width: '600' },
        { width: '400' },
      ]);
    }
    if (picture) imageSection.appendChild(picture);
  }

  // Content section
  const contentSection = document.createElement('div');
  contentSection.className = 'pd-content';

  // Category
  if (category && category.length > 0) {
    const categoryText = category
      .map((cat) => cat.replace(/^luma:/, '').replace(/\//g, ' / ').toUpperCase())
      .join(', ');
    const categoryEl = document.createElement('p');
    categoryEl.className = 'pd-category';
    categoryEl.textContent = categoryText;
    contentSection.appendChild(categoryEl);
  }

  // Name
  const nameEl = document.createElement('h1');
  nameEl.className = 'pd-name';
  nameEl.textContent = name || '';
  contentSection.appendChild(nameEl);

  // Price
  if (price) {
    const priceEl = document.createElement('p');
    priceEl.className = 'pd-price';
    priceEl.textContent = `$${price}`;
    contentSection.appendChild(priceEl);
  }

  // Description (using HTML format)
  if (description?.html) {
    const descEl = document.createElement('div');
    descEl.className = 'pd-description';
    descEl.innerHTML = description.html;
    contentSection.appendChild(descEl);
  }

  // Action buttons
  const actionsEl = document.createElement('div');
  actionsEl.className = 'pd-actions';

  const addToCartBtn = document.createElement('button');
  addToCartBtn.className = 'pd-btn pd-btn-primary';
  addToCartBtn.textContent = 'Add to Cart';
  addToCartBtn.setAttribute('aria-label', `Add ${name} to cart`);
  addToCartBtn.addEventListener('click', () => {
    // eslint-disable-next-line no-console
    console.log('Add to cart:', sku);
    // TODO: Implement cart functionality
  });

  const addToWishlistBtn = document.createElement('button');
  addToWishlistBtn.className = 'pd-btn pd-btn-secondary';
  addToWishlistBtn.textContent = 'Add to Wishlist';
  addToWishlistBtn.setAttribute('aria-label', `Add ${name} to wishlist`);
  addToWishlistBtn.addEventListener('click', () => {
    // eslint-disable-next-line no-console
    console.log('Add to wishlist:', sku);
    // TODO: Implement wishlist functionality
  });

  actionsEl.append(addToCartBtn, addToWishlistBtn);
  contentSection.appendChild(actionsEl);

  container.append(imageSection, contentSection);
  return container;
}

/**
 * Decorate the product detail block
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  const isAuthor = isAuthorEnvironment();

  // Extract folder path from block config
  let folderHref = '';
  const link = block.querySelector('a[href]');
  if (link) {
    folderHref = link.getAttribute('href');
  } else {
    const config = readBlockConfig(block);
    folderHref = config.folder || '';
  }

  // Strip .html extension if present
  if (folderHref && folderHref.endsWith('.html')) {
    folderHref = folderHref.replace(/\.html$/, '');
  }

  // Get SKU from URL query parameter
  const sku = getQueryParam('productId');

  // Clear block content
  block.textContent = '';

  if (!folderHref) {
    const errorMsg = document.createElement('p');
    errorMsg.className = 'pd-error';
    errorMsg.textContent = 'Please configure the product folder path in the properties panel.';
    block.appendChild(errorMsg);
    return;
  }

  if (!sku) {
    const errorMsg = document.createElement('p');
    errorMsg.className = 'pd-error';
    errorMsg.textContent = 'Product not found. Missing product ID in URL.';
    block.appendChild(errorMsg);
    return;
  }

  // Show loading state
  const loader = document.createElement('p');
  loader.className = 'pd-loading';
  loader.textContent = 'Loading product details...';
  block.appendChild(loader);

  // Fetch and display product
  const product = await fetchProductDetail(folderHref, sku);

  block.textContent = '';

  if (!product) {
    const errorMsg = document.createElement('p');
    errorMsg.className = 'pd-error';
    errorMsg.textContent = 'Product not found or failed to load.';
    block.appendChild(errorMsg);
    return;
  }

  const productDetail = buildProductDetail(product, isAuthor);
  block.appendChild(productDetail);
}

