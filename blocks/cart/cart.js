import { createOptimizedPicture, readBlockConfig } from "../../scripts/aem.js";
import { isAuthorEnvironment } from "../../scripts/scripts.js";

/**
 * Format price as currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted price
 */
function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}

/**
 * Update cart totals display
 * @param {HTMLElement} block - Cart block element
 * @param {Object} cartData - Cart data from dataLayer
 */
function updateCartTotals(block, cartData) {
  const subtotalEl = block.querySelector(".cart-subtotal-value");
  const totalEl = block.querySelector(".cart-total-value");
  const productCountEl = block.querySelector(".cart-product-count");

  if (subtotalEl) {
    subtotalEl.textContent = formatPrice(cartData.subTotal || 0);
  }
  if (totalEl) {
    totalEl.textContent = formatPrice(cartData.total || 0);
  }
  if (productCountEl) {
    productCountEl.textContent = cartData.productCount || 0;
  }
}

/**
 * Remove product from cart
 * @param {string} productId - Product ID to remove
 * @param {HTMLElement} block - Cart block element
 */
function removeFromCart(productId, block) {
  const currentCart = window.getDataLayerProperty("cart") || {
    productCount: 0,
    products: {},
    subTotal: 0,
    total: 0,
  };

  if (currentCart.products[productId]) {
    delete currentCart.products[productId];

    // Recalculate totals
    const productValues = Object.values(currentCart.products);
    currentCart.productCount = productValues.reduce(
      (sum, p) => sum + p.quantity,
      0
    );
    currentCart.subTotal = productValues.reduce(
      (sum, p) => sum + p.subTotal,
      0
    );
    currentCart.total = currentCart.subTotal;

    // Update dataLayer
    window.updateDataLayer({ cart: currentCart });

    // Refresh cart display
    renderCartItems(block, currentCart);
    updateCartTotals(block, currentCart);

    // eslint-disable-next-line no-console
    console.log("Product removed from cart:", productId);
  }
}

/**
 * Update product quantity in cart
 * @param {string} productId - Product ID
 * @param {number} newQuantity - New quantity
 * @param {HTMLElement} block - Cart block element
 */
function updateQuantity(productId, newQuantity, block) {
  const quantity = parseInt(newQuantity, 10);
  if (quantity < 1) {
    removeFromCart(productId, block);
    return;
  }

  const currentCart = window.getDataLayerProperty("cart") || {
    productCount: 0,
    products: {},
    subTotal: 0,
    total: 0,
  };

  if (currentCart.products[productId]) {
    currentCart.products[productId].quantity = quantity;
    currentCart.products[productId].subTotal =
      quantity * currentCart.products[productId].price;
    currentCart.products[productId].total =
      currentCart.products[productId].subTotal;

    // Recalculate cart totals
    const productValues = Object.values(currentCart.products);
    currentCart.productCount = productValues.reduce(
      (sum, p) => sum + p.quantity,
      0
    );
    currentCart.subTotal = productValues.reduce(
      (sum, p) => sum + p.subTotal,
      0
    );
    currentCart.total = currentCart.subTotal;

    // Update dataLayer
    window.updateDataLayer({ cart: currentCart });

    // Update display
    updateCartTotals(block, currentCart);

    // Update individual product total
    const productRow = block.querySelector(`[data-product-id="${productId}"]`);
    if (productRow) {
      const priceEl = productRow.querySelector(".cart-item-price");
      if (priceEl) {
        priceEl.textContent = formatPrice(
          currentCart.products[productId].subTotal
        );
      }
    }

    // eslint-disable-next-line no-console
    console.log("Cart quantity updated:", { productId, quantity });
  }
}

/**
 * Build cart item row
 * @param {Object} product - Product data
 * @param {HTMLElement} block - Cart block element
 * @param {boolean} isAuthor - Is author environment
 * @returns {HTMLElement} Cart item row
 */
function buildCartItem(product, block, isAuthor) {
  const { id, name, images, quantity, price, subTotal } = product;

  const row = document.createElement("div");
  row.className = "cart-item";
  row.setAttribute("data-product-id", id);

  // Product image and info
  const productCell = document.createElement("div");
  productCell.className = "cart-item-product";

  const imageWrap = document.createElement("div");
  imageWrap.className = "cart-item-image";

  if (images) {
    let picture = null;
    if (!isAuthor && images.startsWith("http")) {
      picture = document.createElement("picture");
      const img = document.createElement("img");
      img.src = images;
      img.alt = name || "Product image";
      img.loading = "lazy";
      picture.appendChild(img);
    } else {
      picture = createOptimizedPicture(images, name || "Product image", false, [
        { width: "200" },
      ]);
    }
    if (picture) imageWrap.appendChild(picture);
  }

  const nameEl = document.createElement("div");
  nameEl.className = "cart-item-name";
  nameEl.textContent = name || "";

  productCell.append(imageWrap, nameEl);

  // Quantity
  const qtyCell = document.createElement("div");
  qtyCell.className = "cart-item-qty";

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.min = "1";
  qtyInput.value = quantity;
  qtyInput.className = "cart-qty-input";
  qtyInput.setAttribute("aria-label", `Quantity for ${name}`);
  qtyInput.addEventListener("change", (e) => {
    updateQuantity(id, e.target.value, block);
  });

  qtyCell.appendChild(qtyInput);

  // Price
  const priceCell = document.createElement("div");
  priceCell.className = "cart-item-price";
  priceCell.textContent = formatPrice(subTotal || price * quantity);

  // Remove button
  const removeCell = document.createElement("div");
  removeCell.className = "cart-item-remove";

  const removeBtn = document.createElement("button");
  removeBtn.className = "cart-remove-btn";
  removeBtn.innerHTML = "&times;";
  removeBtn.setAttribute("aria-label", `Remove ${name} from cart`);
  removeBtn.addEventListener("click", () => {
    removeFromCart(id, block);
  });

  removeCell.appendChild(removeBtn);

  row.append(productCell, qtyCell, priceCell, removeCell);
  return row;
}

/**
 * Render cart items
 * @param {HTMLElement} block - Cart block element
 * @param {Object} cartData - Cart data from dataLayer
 */
function renderCartItems(block, cartData) {
  const isAuthor = isAuthorEnvironment();
  const itemsContainer = block.querySelector(".cart-items");

  if (!itemsContainer) return;

  itemsContainer.innerHTML = "";

  const products = cartData.products || {};
  const productValues = Object.values(products);

  if (productValues.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "cart-empty";
    emptyMsg.textContent = "Your cart is empty";
    itemsContainer.appendChild(emptyMsg);
    return;
  }

  // Add header
  const header = document.createElement("div");
  header.className = "cart-item cart-header";
  header.innerHTML = `
    <div class="cart-item-product">PRODUCT</div>
    <div class="cart-item-qty">QTY</div>
    <div class="cart-item-price">PRICE</div>
    <div class="cart-item-remove"></div>
  `;
  itemsContainer.appendChild(header);

  // Add items
  productValues.forEach((product) => {
    const item = buildCartItem(product, block, isAuthor);
    itemsContainer.appendChild(item);
  });
}

/**
 * Apply discount code
 * @param {string} code - Discount code
 * @param {HTMLElement} block - Cart block element
 */
function applyDiscount(code, block) {
  // eslint-disable-next-line no-console
  console.log("Applying discount code:", code);

  // TODO: Implement actual discount logic
  // For now, just show a message
  const discountValueEl = block.querySelector(".cart-discount-value");
  if (discountValueEl) {
    discountValueEl.textContent = "----";
  }

  // Show feedback
  const applyBtn = block.querySelector(".cart-apply-discount");
  if (applyBtn) {
    const originalText = applyBtn.textContent;
    applyBtn.textContent = "Applied!";
    setTimeout(() => {
      applyBtn.textContent = originalText;
    }, 2000);
  }
}

/**
 * Handle checkout
 */
function handleCheckout() {
  const cartData = window.getDataLayerProperty("cart");
  if (!cartData || !cartData.productCount || cartData.productCount === 0) {
    alert("Your cart is empty");
    return;
  }

  // eslint-disable-next-line no-console
  console.log("Proceeding to checkout with cart:", cartData);

  // TODO: Navigate to checkout page
  alert(`Proceeding to checkout with ${cartData.productCount} item(s)`);
}

/**
 * Build cart summary section
 * @param {Object} cartData - Cart data
 * @returns {HTMLElement} Cart summary
 */
function buildCartSummary(cartData) {
  const summary = document.createElement("div");
  summary.className = "cart-summary";

  const discountSection = document.createElement("div");
  discountSection.className = "cart-discount";

  const discountLabel = document.createElement("label");
  discountLabel.className = "cart-discount-label";
  discountLabel.textContent = "Discount code";
  discountLabel.setAttribute("for", "discount-code-input");

  const discountInput = document.createElement("input");
  discountInput.type = "text";
  discountInput.id = "discount-code-input";
  discountInput.className = "cart-discount-input";
  discountInput.placeholder = "";
  discountInput.setAttribute("aria-label", "Discount code");

  const applyBtn = document.createElement("button");
  applyBtn.className = "cart-apply-discount";
  applyBtn.textContent = "APPLY";
  applyBtn.addEventListener("click", () => {
    const code = discountInput.value.trim();
    if (code) {
      applyDiscount(code, summary.closest(".cart"));
    }
  });

  const discountInputWrap = document.createElement("div");
  discountInputWrap.className = "cart-discount-input-wrap";
  discountInputWrap.append(discountInput, applyBtn);

  discountSection.append(discountLabel, discountInputWrap);

  const totalsSection = document.createElement("div");
  totalsSection.className = "cart-totals";

  // Subtotal
  const subtotalRow = document.createElement("div");
  subtotalRow.className = "cart-total-row";
  subtotalRow.innerHTML = `
    <span>Subtotal</span>
    <span class="cart-subtotal-value">${formatPrice(
      cartData.subTotal || 0
    )}</span>
  `;

  // Shipping
  const shippingRow = document.createElement("div");
  shippingRow.className = "cart-total-row";
  shippingRow.innerHTML = `
    <span>Shipping</span>
    <span>---</span>
  `;

  // Discount
  const discountRow = document.createElement("div");
  discountRow.className = "cart-total-row";
  discountRow.innerHTML = `
    <span>Discount</span>
    <span class="cart-discount-value">----</span>
  `;

  // Total
  const totalRow = document.createElement("div");
  totalRow.className = "cart-total-row cart-total-row-final";
  totalRow.innerHTML = `
    <span>Total</span>
    <span class="cart-total-value">${formatPrice(cartData.total || 0)}</span>
  `;

  totalsSection.append(subtotalRow, shippingRow, discountRow, totalRow);

  // Checkout button
  const checkoutBtn = document.createElement("button");
  checkoutBtn.className = "cart-checkout-btn";
  checkoutBtn.textContent = "CHECKOUT";
  checkoutBtn.addEventListener("click", handleCheckout);

  summary.append(discountSection, totalsSection, checkoutBtn);
  return summary;
}

/**
 * Fetch all products from a folder
 * @param {string} path - Content fragment folder path
 * @param {boolean} isAuthor - Is author environment
 * @returns {Promise<Array>} - Array of products
 */
async function fetchAllProducts(path, isAuthor) {
  try {
    if (!path) {
      // eslint-disable-next-line no-console
      console.log("You May Also Like: No path provided");
      return [];
    }
    const baseUrl = isAuthor
      ? "https://author-p168578-e1802821.adobeaemcloud.com"
      : "https://275323-918sangriatortoise.adobeioruntime.net/api/v1/web/dx-excshell-1/lumaProductsGraphQl";
    const url = `${baseUrl}/graphql/execute.json/luma3/menproductspagelister?_path=${path}`;
    // eslint-disable-next-line no-console
    console.log("You May Also Like: Fetching from URL:", url);
    const resp = await fetch(url, { method: "GET" });
    const json = await resp.json();
    // eslint-disable-next-line no-console
    console.log("You May Also Like: GraphQL response:", json);
    const items = json?.data?.productsModelList?.items || [];
    const filtered = items.filter((item) => item && item.sku);
    // eslint-disable-next-line no-console
    console.log("You May Also Like: All products fetched:", filtered.length);
    return filtered;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Cart: fetch all products error", e);
    return [];
  }
}

/**
 * Build a recommendation card
 * @param {Object} item - Product data
 * @param {boolean} isAuthor - Is author environment
 * @returns {HTMLElement} - Product card
 */
function buildRecommendationCard(item, isAuthor) {
  const { id, sku, name, image = {}, category = [] } = item || {};
  let imgUrl = isAuthor ? image?._authorUrl : image?._publishUrl;
  const productId = sku || id || "";

  const card = document.createElement("article");
  card.className = "cart-rec-card";

  // Make card clickable and redirect to product page
  if (productId) {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const currentPath = window.location.pathname;

      // Smart path construction: ensure we navigate to the correct product page
      let basePath = currentPath.substring(0, currentPath.lastIndexOf("/"));

      // If the current page doesn't have a language segment, try to add it
      const langPattern = /\/(en|fr|de|es|it|ja|zh|pt|nl|sv|da|no|fi)$/;
      if (!langPattern.test(basePath) && !basePath.includes("/en/")) {
        const pathMatch = currentPath.match(
          /\/(en|fr|de|es|it|ja|zh|pt|nl|sv|da|no|fi)\//
        );
        if (pathMatch) {
          const langCode = pathMatch[1];
          const langIndex = currentPath.indexOf(`/${langCode}/`);
          basePath = currentPath.substring(0, langIndex + langCode.length + 1);
        } else {
          basePath = `${basePath}/en`;
        }
      }

      // On author add .html extension, on publish don't
      const productPath = isAuthor
        ? `${basePath}/product.html`
        : `${basePath}/product`;
      window.location.href = `${productPath}?productId=${encodeURIComponent(
        productId
      )}`;
    });
  }

  // Handle image display for author vs publish
  let picture = null;
  if (imgUrl) {
    if (!isAuthor && imgUrl.startsWith("http")) {
      picture = document.createElement("picture");
      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = name || "Product image";
      img.loading = "lazy";
      picture.appendChild(img);
    } else {
      picture = createOptimizedPicture(imgUrl, name || "Product image", false, [
        { media: "(min-width: 900px)", width: "600" },
        { media: "(min-width: 600px)", width: "400" },
        { width: "320" },
      ]);
    }
  }

  const imgWrap = document.createElement("div");
  imgWrap.className = "cart-rec-card-media";
  if (picture) imgWrap.append(picture);

  const meta = document.createElement("div");
  meta.className = "cart-rec-card-meta";
  const categoryText = category && category.length ? category.join(", ") : "";
  const cat = document.createElement("p");
  cat.className = "cart-rec-card-category";
  cat.textContent = categoryText.replaceAll("luma:", "").replaceAll("/", ", ");
  const title = document.createElement("h3");
  title.className = "cart-rec-card-title";
  title.textContent = name || "";
  meta.append(cat, title);

  card.append(imgWrap, meta);
  return card;
}

/**
 * Build "You May Also Like" recommendations section
 * @param {Array} allProducts - All products from the folder
 * @param {Object} cartData - Cart data from dataLayer
 * @param {boolean} isAuthor - Is author environment
 * @returns {HTMLElement|null} Recommendations section
 */
function buildRecommendations(allProducts, cartData, isAuthor) {
  // Get categories from cart products
  const cartProducts = Object.values(cartData.products || {});
  const cartCategories = new Set();

  cartProducts.forEach((product) => {
    if (product.category) {
      // Split by comma and clean up
      const categories = product.category.split(",").map((c) => c.trim());
      categories.forEach((cat) => {
        // Convert back to luma: format for matching
        const lumaCategory = `${cat.replace(/ \/ /g, "/")}`;
        cartCategories.add(lumaCategory);
      });
    }
  });

  // eslint-disable-next-line no-console
  console.log(
    "You May Also Like: Cart categories:",
    Array.from(cartCategories)
  );

  // Get cart product IDs to exclude
  const cartProductIds = new Set(Object.keys(cartData.products || {}));

  // Debug: Log first few product categories from allProducts
  // eslint-disable-next-line no-console
  console.log(
    "You May Also Like: Sample product categories from allProducts:",
    allProducts.slice(0, 3).map((p) => ({
      sku: p.sku,
      name: p.name,
      categories: p.category,
    }))
  );

  // Filter products by matching category and exclude items in cart
  const recommendations = allProducts
    .filter((product) => {
      // Exclude products already in cart
      if (cartProductIds.has(product.sku || product.id)) return false;

      // Check if product has any matching category
      const productCategories = product.category || [];
      return productCategories.some((cat) => cartCategories.has(cat));
    })
    .slice(0, 5); // Limit to 5 products

  // eslint-disable-next-line no-console
  console.log(
    "You May Also Like: Filtered recommendations:",
    recommendations.length
  );

  if (recommendations.length === 0) {
    return null;
  }

  const section = document.createElement("div");
  section.className = "cart-recommendations";

  const title = document.createElement("h2");
  title.className = "cart-rec-title";
  title.textContent = "YOU MAY ALSO LIKE";

  const grid = document.createElement("div");
  grid.className = "cart-rec-grid";

  recommendations.forEach((product) => {
    const card = buildRecommendationCard(product, isAuthor);
    grid.append(card);
  });

  section.append(title, grid);
  return section;
}

/**
 * Listen for dataLayer updates and refresh cart
 * @param {HTMLElement} block - Cart block element
 * @param {string} folderHref - Product folder path
 * @param {boolean} isAuthor - Is author environment
 * @param {Array} allProducts - Cached products list
 */
function setupDataLayerListener(block, folderHref, isAuthor, allProducts) {
  document.addEventListener("dataLayerUpdated", async (event) => {
    const { dataLayer } = event.detail;
    if (dataLayer && dataLayer.cart) {
      // eslint-disable-next-line no-console
      console.log("Cart data updated, refreshing display");
      renderCartItems(block, dataLayer.cart);
      updateCartTotals(block, dataLayer.cart);

      // Rebuild recommendations if folder is provided
      if (folderHref && allProducts && allProducts.length > 0) {
        const container = block.querySelector(".cart-container");
        if (container) {
          // Remove existing recommendations
          const existingRec = container.querySelector(".cart-recommendations");
          if (existingRec) {
            existingRec.remove();
          }

          // Build new recommendations based on updated cart
          const recommendations = buildRecommendations(
            allProducts,
            dataLayer.cart,
            isAuthor
          );
          if (recommendations) {
            container.appendChild(recommendations);
          }
        }
      }
    }
  });
}

/**
 * Decorate the cart block
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  const isAuthor = isAuthorEnvironment();

  // Extract folder path from block config
  let folderHref = "";
  const link = block.querySelector("a[href]");
  if (link) {
    folderHref = link.getAttribute("href");
  } else {
    const config = readBlockConfig(block);
    folderHref = config.folder || "";
  }

  // Strip .html extension if present
  if (folderHref && folderHref.endsWith(".html")) {
    folderHref = folderHref.replace(/\.html$/, "");
  }

  block.textContent = "";

  // Build cart structure
  const container = document.createElement("div");
  container.className = "cart-container";

  // Cart title
  const title = document.createElement("h1");
  title.className = "cart-title";
  title.textContent = "SHOPPING CART";

  // Cart main section
  const mainSection = document.createElement("div");
  mainSection.className = "cart-main";

  // Cart items container
  const itemsContainer = document.createElement("div");
  itemsContainer.className = "cart-items";

  mainSection.appendChild(itemsContainer);

  // Get cart data from dataLayer
  const cartData = window.getDataLayerProperty
    ? window.getDataLayerProperty("cart")
    : null;

  const currentCart = cartData || {
    productCount: 0,
    products: {},
    subTotal: 0,
    total: 0,
  };

  // Render initial cart items
  renderCartItems(block, currentCart);

  // Build cart summary
  const summary = buildCartSummary(currentCart);

  // Build layout
  const cartContent = document.createElement("div");
  cartContent.className = "cart-content";
  cartContent.append(mainSection, summary);

  container.append(title, cartContent);
  block.appendChild(container);

  // Fetch products and build recommendations if folder is provided
  let allProducts = [];
  if (folderHref) {
    allProducts = await fetchAllProducts(folderHref, isAuthor);
    const recommendations = buildRecommendations(
      allProducts,
      currentCart,
      isAuthor
    );
    if (recommendations) {
      container.appendChild(recommendations);
    }
  }

  // Setup dataLayer listener for real-time updates
  setupDataLayerListener(block, folderHref, isAuthor, allProducts);

  // eslint-disable-next-line no-console
  console.log("Cart initialized with", currentCart.productCount, "items");
}
