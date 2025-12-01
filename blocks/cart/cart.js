import { createOptimizedPicture } from "../../scripts/aem.js";
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
 * Build "You May Also Like" section
 * @returns {HTMLElement} Recommendations section
 */
function buildRecommendations() {
  const section = document.createElement("div");
  section.className = "cart-recommendations";

  const title = document.createElement("h2");
  title.className = "cart-rec-title";
  title.textContent = "YOU MAY ALSO LIKE";

  const grid = document.createElement("div");
  grid.className = "cart-rec-grid";

  // Placeholder for recommendations
  // TODO: Fetch and display actual product recommendations
  const placeholder = document.createElement("p");
  placeholder.className = "cart-rec-placeholder";
  placeholder.textContent = "Product recommendations coming soon...";
  grid.appendChild(placeholder);

  section.append(title, grid);
  return section;
}

/**
 * Listen for dataLayer updates and refresh cart
 * @param {HTMLElement} block - Cart block element
 */
function setupDataLayerListener(block) {
  document.addEventListener("dataLayerUpdated", (event) => {
    const { dataLayer } = event.detail;
    if (dataLayer && dataLayer.cart) {
      // eslint-disable-next-line no-console
      console.log("Cart data updated, refreshing display");
      renderCartItems(block, dataLayer.cart);
      updateCartTotals(block, dataLayer.cart);
    }
  });
}

/**
 * Decorate the cart block
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
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

  // Build recommendations section
  const recommendations = buildRecommendations();

  container.append(title, cartContent, recommendations);
  block.appendChild(container);

  // Setup dataLayer listener for real-time updates
  setupDataLayerListener(block);

  // eslint-disable-next-line no-console
  console.log("Cart initialized with", currentCart.productCount, "items");
}
