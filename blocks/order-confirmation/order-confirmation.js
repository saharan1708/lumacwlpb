/**
 * Generate random order number
 * @returns {string} Random order number
 */
function generateOrderNumber() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${timestamp}${random}`;
}

/**
 * Reset dataLayer to default state
 */
function resetDataLayer() {
  const defaultCart = {
    productCount: 0,
    products: {},
    subTotal: 0,
    total: 0,
  };

  if (window.updateDataLayer) {
    window.updateDataLayer({ cart: defaultCart });
    // eslint-disable-next-line no-console
    console.log("DataLayer cart reset to default");
  }
}

/**
 * Clear checkout data from localStorage
 */
function clearCheckoutData() {
  localStorage.removeItem("luma_checkout_data");
  // eslint-disable-next-line no-console
  console.log("Checkout data cleared from localStorage");
}

/**
 * Navigate to home page
 */
function navigateToHome() {
  window.location.href = "/";
}

/**
 * Build order confirmation content
 * @param {string} orderNumber - Generated order number
 * @returns {HTMLElement} Confirmation content
 */
function buildConfirmationContent(orderNumber) {
  const content = document.createElement("div");
  content.className = "order-confirmation-content";

  const message = document.createElement("div");
  message.className = "order-confirmation-message";

  const thankYou = document.createElement("h1");
  thankYou.className = "order-confirmation-title";
  thankYou.textContent = "THANK YOU!";

  const subtitle = document.createElement("p");
  subtitle.className = "order-confirmation-subtitle";
  subtitle.textContent = "WE RECEIVED YOUR ORDER";

  const orderInfo = document.createElement("p");
  orderInfo.className = "order-confirmation-number";
  orderInfo.innerHTML = `Order No. <strong>${orderNumber}</strong>`;

  const details = document.createElement("p");
  details.className = "order-confirmation-details";
  details.textContent =
    "We are processing your order and a confirmation email has been sent to your email address.";

  const shippingInfo = document.createElement("p");
  shippingInfo.className = "order-confirmation-details";
  shippingInfo.textContent =
    "Please check your inbox for further details on shipping and contacts.";

  const support = document.createElement("p");
  support.className = "order-confirmation-support";
  support.textContent =
    "If you experience any problems or just have a question, you can email us and we will get back to you shortly.";

  const homeBtn = document.createElement("button");
  homeBtn.className = "order-confirmation-btn";
  homeBtn.textContent = "RETURN TO HOME PAGE";
  homeBtn.addEventListener("click", () => {
    resetDataLayer();
    clearCheckoutData();
    // Small delay to ensure dataLayer is updated
    setTimeout(() => {
      navigateToHome();
    }, 100);
  });

  message.append(thankYou, subtitle, orderInfo, details, shippingInfo, support);
  content.append(message, homeBtn);

  return content;
}

/**
 * Decorate the order confirmation block
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  block.textContent = "";

  const orderNumber = generateOrderNumber();

  const container = document.createElement("div");
  container.className = "order-confirmation-container";

  const content = buildConfirmationContent(orderNumber);

  container.appendChild(content);
  block.appendChild(container);

  // eslint-disable-next-line no-console
  console.log("Order Confirmation initialized with order number:", orderNumber);
}
