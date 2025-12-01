/**
 * Load checkout data from localStorage
 * @returns {Object|null} Saved checkout data
 */
function loadCheckoutData() {
  const saved = localStorage.getItem("luma_checkout_data");
  return saved ? JSON.parse(saved) : null;
}

/**
 * Get cart data from dataLayer
 * @returns {Object} Cart data
 */
function getCartData() {
  const cartData = window.getDataLayerProperty
    ? window.getDataLayerProperty("cart")
    : null;

  return cartData || { productCount: 0, products: {}, subTotal: 0, total: 0 };
}

/**
 * Format price as currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted price
 */
function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}

/**
 * Navigate to a page
 * @param {string} page - Page to navigate to
 */
function navigateToPage(page) {
  const currentPath = window.location.pathname;
  const basePath = currentPath.substring(0, currentPath.lastIndexOf("/"));
  window.location.href = `${basePath}/${page}`;
}

/**
 * Build order summary
 * @param {Object} checkoutData - Checkout data from localStorage
 * @param {Object} cartData - Cart data from dataLayer
 * @returns {HTMLElement} Order summary container
 */
function buildOrderSummary(checkoutData, cartData) {
  const container = document.createElement("div");
  container.className = "order-summary-content";

  // Left Column - Order Items
  const leftColumn = document.createElement("div");
  leftColumn.className = "order-summary-items";

  const products = Object.values(cartData.products || {});

  if (products.length > 0) {
    products.forEach((product) => {
      const item = document.createElement("div");
      item.className = "order-summary-item";

      const image = document.createElement("div");
      image.className = "order-summary-item-image";
      if (product.images) {
        const img = document.createElement("img");
        img.src = product.images;
        img.alt = product.name || "Product image";
        img.loading = "lazy";
        image.appendChild(img);
      }

      const details = document.createElement("div");
      details.className = "order-summary-item-details";

      const name = document.createElement("div");
      name.className = "order-summary-item-name";
      name.textContent = product.name || "";

      const meta = document.createElement("div");
      meta.className = "order-summary-item-meta";
      meta.innerHTML = `
        <div class="order-summary-item-row">
          <span>QTY</span>
          <span>${product.quantity || 1}</span>
        </div>
        <div class="order-summary-item-row">
          <span>PRICE</span>
          <span>${formatPrice(product.price || 0)}</span>
        </div>
      `;

      details.append(name, meta);
      item.append(image, details);
      leftColumn.appendChild(item);
    });
  } else {
    const emptyMsg = document.createElement("p");
    emptyMsg.className = "order-summary-empty";
    emptyMsg.textContent = "No items in order";
    leftColumn.appendChild(emptyMsg);
  }

  // Right Column - Billing & Summary
  const rightColumn = document.createElement("div");
  rightColumn.className = "order-summary-sidebar";

  // Billing Address
  const billingSection = document.createElement("div");
  billingSection.className = "order-summary-section";

  const billingTitle = document.createElement("h2");
  billingTitle.className = "order-summary-section-title";
  billingTitle.textContent = "Billing address";

  const billingContent = document.createElement("div");
  billingContent.className = "order-summary-address";

  if (checkoutData) {
    billingContent.innerHTML = `
      <p class="order-summary-name">${checkoutData.firstName} ${checkoutData.lastName}</p>
      <p>${checkoutData.streetAddress}</p>
      <p>${checkoutData.city} ${checkoutData.postalCode} ${checkoutData.country}</p>
    `;
  } else {
    billingContent.innerHTML = "<p>No billing address found</p>";
  }

  billingSection.append(billingTitle, billingContent);

  // Shipping
  const shippingSection = document.createElement("div");
  shippingSection.className = "order-summary-section";

  const shippingTitle = document.createElement("h2");
  shippingTitle.className = "order-summary-section-title";
  shippingTitle.textContent = "Shipping";

  const shippingContent = document.createElement("div");
  shippingContent.className = "order-summary-shipping";
  shippingContent.textContent = "---";

  shippingSection.append(shippingTitle, shippingContent);

  // Price Summary
  const priceSection = document.createElement("div");
  priceSection.className = "order-summary-pricing";

  priceSection.innerHTML = `
    <div class="order-summary-price-row">
      <span>Subtotal</span>
      <span>${formatPrice(cartData.subTotal || 0)}</span>
    </div>
    <div class="order-summary-price-row">
      <span>Shipping</span>
      <span>---</span>
    </div>
    <div class="order-summary-price-row">
      <span>Discount</span>
      <span>----</span>
    </div>
    <div class="order-summary-price-row order-summary-price-total">
      <span>Total</span>
      <span>${formatPrice(cartData.total || 0)}</span>
    </div>
  `;

  rightColumn.append(billingSection, shippingSection, priceSection);

  container.append(leftColumn, rightColumn);
  return container;
}

/**
 * Build action buttons
 * @returns {HTMLElement} Buttons container
 */
function buildButtons() {
  const buttonGroup = document.createElement("div");
  buttonGroup.className = "order-summary-buttons";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "order-summary-btn order-summary-btn-back";
  backBtn.textContent = "BACK";
  backBtn.addEventListener("click", () => {
    navigateToPage("checkout");
  });

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "order-summary-btn order-summary-btn-confirm";
  confirmBtn.textContent = "CONFIRM ORDER";
  confirmBtn.addEventListener("click", () => {
    navigateToPage("order-confirmation");
  });

  buttonGroup.append(backBtn, confirmBtn);
  return buttonGroup;
}

/**
 * Decorate the order summary block
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  block.textContent = "";

  const checkoutData = loadCheckoutData();
  const cartData = getCartData();

  const container = document.createElement("div");
  container.className = "order-summary-container";

  const title = document.createElement("h1");
  title.className = "order-summary-title";
  title.textContent = "ORDER SUMMARY";

  const summary = buildOrderSummary(checkoutData, cartData);
  const buttons = buildButtons();

  container.append(title, summary, buttons);
  block.appendChild(container);

  // eslint-disable-next-line no-console
  console.log("Order Summary initialized");
}

