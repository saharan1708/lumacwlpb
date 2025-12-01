/**
 * Save form data to localStorage
 * @param {Object} formData - Form data to save
 */
function saveCheckoutData(formData) {
  localStorage.setItem("luma_checkout_data", JSON.stringify(formData));
  // eslint-disable-next-line no-console
  console.log("Checkout data saved to localStorage:", formData);
}

/**
 * Load saved checkout data from localStorage
 * @returns {Object|null} Saved checkout data
 */
function loadCheckoutData() {
  const saved = localStorage.getItem("luma_checkout_data");
  return saved ? JSON.parse(saved) : null;
}

/**
 * Validate form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result
 */
function validateForm(formData) {
  const errors = {};

  if (!formData.firstName?.trim()) {
    errors.firstName = "First name is required";
  }
  if (!formData.lastName?.trim()) {
    errors.lastName = "Last name is required";
  }
  if (!formData.email?.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = "Please enter a valid email";
  }
  if (!formData.phone?.trim()) {
    errors.phone = "Phone number is required";
  }
  if (!formData.streetAddress?.trim()) {
    errors.streetAddress = "Street address is required";
  }
  if (!formData.city?.trim()) {
    errors.city = "City is required";
  }
  if (!formData.postalCode?.trim()) {
    errors.postalCode = "Postal code is required";
  }
  if (!formData.country?.trim()) {
    errors.country = "Country is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Display validation errors
 * @param {Object} errors - Validation errors
 * @param {HTMLElement} form - Form element
 */
function displayErrors(errors, form) {
  // Clear previous errors
  form.querySelectorAll(".checkout-error").forEach((el) => el.remove());

  Object.keys(errors).forEach((fieldName) => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.classList.add("checkout-field-error");
      const errorMsg = document.createElement("div");
      errorMsg.className = "checkout-error";
      errorMsg.textContent = errors[fieldName];
      field.parentNode.appendChild(errorMsg);
    }
  });
}

/**
 * Clear validation errors
 * @param {HTMLElement} form - Form element
 */
function clearErrors(form) {
  form.querySelectorAll(".checkout-error").forEach((el) => el.remove());
  form
    .querySelectorAll(".checkout-field-error")
    .forEach((el) => el.classList.remove("checkout-field-error"));
}

/**
 * Get cart summary from dataLayer
 * @returns {Object} Cart summary
 */
function getCartSummary() {
  const cartData = window.getDataLayerProperty
    ? window.getDataLayerProperty("cart")
    : null;

  return cartData || { productCount: 0, subTotal: 0, total: 0 };
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
 * Build checkout form
 * @returns {HTMLElement} Checkout form
 */
function buildCheckoutForm() {
  const savedData = loadCheckoutData();

  const form = document.createElement("form");
  form.className = "checkout-form";

  // Personal Information Section
  const personalSection = document.createElement("div");
  personalSection.className = "checkout-section";

  const personalTitle = document.createElement("h2");
  personalTitle.className = "checkout-section-title";
  personalTitle.textContent = "Personal information";

  const personalGrid = document.createElement("div");
  personalGrid.className = "checkout-grid";

  // First Name
  const firstNameGroup = document.createElement("div");
  firstNameGroup.className = "checkout-field-group";
  firstNameGroup.innerHTML = `
    <label for="firstName">First name <span class="required">*</span></label>
    <input type="text" id="firstName" name="firstName" value="${
      savedData?.firstName || ""
    }" required>
  `;

  // Last Name
  const lastNameGroup = document.createElement("div");
  lastNameGroup.className = "checkout-field-group";
  lastNameGroup.innerHTML = `
    <label for="lastName">Last name <span class="required">*</span></label>
    <input type="text" id="lastName" name="lastName" value="${
      savedData?.lastName || ""
    }" required>
  `;

  // Email
  const emailGroup = document.createElement("div");
  emailGroup.className = "checkout-field-group";
  emailGroup.innerHTML = `
    <label for="email">Email <span class="required">*</span></label>
    <input type="email" id="email" name="email" value="${
      savedData?.email || ""
    }" required>
  `;

  // Phone
  const phoneGroup = document.createElement("div");
  phoneGroup.className = "checkout-field-group";
  phoneGroup.innerHTML = `
    <label for="phone">Phone number</label>
    <input type="tel" id="phone" name="phone" value="${savedData?.phone || ""}">
  `;

  // Street Address
  const streetGroup = document.createElement("div");
  streetGroup.className = "checkout-field-group checkout-field-full";
  streetGroup.innerHTML = `
    <label for="streetAddress">Street address</label>
    <input type="text" id="streetAddress" name="streetAddress" value="${
      savedData?.streetAddress || ""
    }">
  `;

  // City
  const cityGroup = document.createElement("div");
  cityGroup.className = "checkout-field-group";
  cityGroup.innerHTML = `
    <label for="city">City</label>
    <input type="text" id="city" name="city" value="${savedData?.city || ""}">
  `;

  // Postal Code
  const postalGroup = document.createElement("div");
  postalGroup.className = "checkout-field-group";
  postalGroup.innerHTML = `
    <label for="postalCode">Postal code</label>
    <input type="text" id="postalCode" name="postalCode" value="${
      savedData?.postalCode || ""
    }">
  `;

  // Country
  const countryGroup = document.createElement("div");
  countryGroup.className = "checkout-field-group";
  countryGroup.innerHTML = `
    <label for="country">Country</label>
    <select id="country" name="country">
      <option value="">Select country</option>
      <option value="United States" ${
        savedData?.country === "United States" ? "selected" : ""
      }>United States</option>
      <option value="Canada" ${
        savedData?.country === "Canada" ? "selected" : ""
      }>Canada</option>
      <option value="United Kingdom" ${
        savedData?.country === "United Kingdom" ? "selected" : ""
      }>United Kingdom</option>
      <option value="Australia" ${
        savedData?.country === "Australia" ? "selected" : ""
      }>Australia</option>
      <option value="India" ${
        savedData?.country === "India" ? "selected" : ""
      }>India</option>
      <option value="Other" ${
        savedData?.country === "Other" ? "selected" : ""
      }>Other</option>
    </select>
  `;

  personalGrid.append(
    firstNameGroup,
    lastNameGroup,
    emailGroup,
    phoneGroup,
    streetGroup,
    cityGroup,
    postalGroup,
    countryGroup
  );

  personalSection.append(personalTitle, personalGrid);

  // Summary Section
  const summarySection = document.createElement("div");
  summarySection.className = "checkout-section checkout-summary";

  const summaryTitle = document.createElement("h2");
  summaryTitle.className = "checkout-section-title";
  summaryTitle.textContent = "Summary";

  const cart = getCartSummary();

  const summaryContent = document.createElement("div");
  summaryContent.className = "checkout-summary-content";
  summaryContent.innerHTML = `
    <div class="checkout-summary-row">
      <span>Subtotal</span>
      <span>$${cart.subTotal?.toFixed(2) || "0.00"}</span>
    </div>
    <div class="checkout-summary-row">
      <span>Shipping</span>
      <span>---</span>
    </div>
    <div class="checkout-summary-row">
      <span>Discount</span>
      <span>----</span>
    </div>
    <div class="checkout-summary-row checkout-summary-total">
      <span>Total</span>
      <span>$${cart.total?.toFixed(2) || "0.00"}</span>
    </div>
  `;

  summarySection.append(summaryTitle, summaryContent);

  // Buttons
  const buttonGroup = document.createElement("div");
  buttonGroup.className = "checkout-buttons";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "checkout-btn checkout-btn-back";
  backBtn.textContent = "BACK";
  backBtn.addEventListener("click", () => {
    navigateToPage("cart");
  });

  const continueBtn = document.createElement("button");
  continueBtn.type = "submit";
  continueBtn.className = "checkout-btn checkout-btn-continue";
  continueBtn.textContent = "CONTINUE";

  buttonGroup.append(backBtn, continueBtn);

  form.append(personalSection, summarySection, buttonGroup);

  // Form submit handler
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      streetAddress: form.streetAddress.value.trim(),
      city: form.city.value.trim(),
      postalCode: form.postalCode.value.trim(),
      country: form.country.value,
    };

    const validation = validateForm(formData);

    if (validation.isValid) {
      saveCheckoutData(formData);
      clearErrors(form);
      navigateToPage("order-summary");
    } else {
      displayErrors(validation.errors, form);
      // Scroll to first error
      const firstError = form.querySelector(".checkout-field-error");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  return form;
}

/**
 * Decorate the checkout block
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  block.textContent = "";

  const container = document.createElement("div");
  container.className = "checkout-container";

  const title = document.createElement("h1");
  title.className = "checkout-title";
  title.textContent = "CHECKOUT";

  const form = buildCheckoutForm();

  container.append(title, form);
  block.appendChild(container);

  // eslint-disable-next-line no-console
  console.log("Checkout page initialized");
}
