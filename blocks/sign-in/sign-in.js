import { isAuthorEnvironment } from "../../scripts/scripts.js";

export default async function decorate(block) {
  const isAuthor = isAuthorEnvironment();

  // Build Adaptive Form definition for Sign In
  const formDef = {
    id: "sign-in",
    fieldType: "form",
    appliedCssClassNames: "sign-in-form",
    items: [
      {
        id: "heading-sign-in",
        fieldType: "heading",
        label: { value: "Sign in to your account" },
        appliedCssClassNames: "col-12",
      },
      {
        id: "panel-main",
        name: "main",
        fieldType: "panel",
        items: [
          {
            id: "email",
            name: "email",
            fieldType: "email",
            label: { value: "Email address" },
            required: true,
            autoComplete: "email",
            properties: { colspan: 12 },
          },
          {
            id: "password",
            name: "password",
            fieldType: "text-input",
            label: { value: "Password" },
            required: true,
            autoComplete: "current-password",
            properties: { colspan: 12 },
            format: "password",
          },
          {
            id: "sign-in-btn",
            name: "signInButton",
            fieldType: "button",
            buttonType: "submit",
            label: { value: "SIGN IN" },
            appliedCssClassNames: "submit-wrapper col-12",
          },
        ],
      },
    ],
  };

  // Create a child form block that reuses the existing form renderer
  const formContainer = document.createElement("div");
  formContainer.className = "form";

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = JSON.stringify(formDef);
  pre.append(code);
  formContainer.append(pre);
  block.replaceChildren(formContainer);

  const formModule = await import("../form/form.js");
  await formModule.default(formContainer);

  // Wait for form to be rendered before attaching handlers
  setTimeout(() => {
    attachSignInHandler(block);
    addCreateAccountLink(block, isAuthor);
  }, 100);
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Attaches sign-in form submission handler
 * @param {HTMLElement} block - The sign-in block
 */
function attachSignInHandler(block) {
  const form = block.querySelector("form");
  if (!form) {
    console.warn("Sign-in form not found");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission

    // Get form values
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');

    if (!emailInput || !passwordInput) {
      showErrorMessage(form, "Form fields not found");
      return;
    }

    const enteredEmail = emailInput.value.trim();
    const enteredPassword = passwordInput.value;

    // Validate email format
    if (!isValidEmail(enteredEmail)) {
      showErrorMessage(form, "Please enter a valid email address");
      emailInput.focus();
      return;
    }

    // Validate password is not empty
    if (!enteredPassword || enteredPassword.trim() === "") {
      showErrorMessage(form, "Please enter your password");
      passwordInput.focus();
      return;
    }

    // Check localStorage for registered user
    const REGISTERED_EMAIL_KEY =
      "com.adobe.reactor.dataElements.Profile - Email";
    let registeredEmail = localStorage.getItem(REGISTERED_EMAIL_KEY);

    // Clean the stored email: remove asterisks, quotes, and trim whitespace
    if (registeredEmail) {
      registeredEmail = registeredEmail
        .replace(/[\*\"\']/g, "") // Remove asterisks and quotes
        .trim();
    }

    if (!registeredEmail || !isValidEmail(registeredEmail)) {
      showErrorMessage(
        form,
        "No account found. Please create an account first."
      );
      return;
    }

    // Debug logging (can be removed later)
    console.log("Sign-in validation:", {
      entered: enteredEmail,
      registered: registeredEmail,
      match: enteredEmail.toLowerCase() === registeredEmail.toLowerCase(),
    });

    // Check if entered email matches registered email (case-insensitive)
    if (enteredEmail.toLowerCase() !== registeredEmail.toLowerCase()) {
      showErrorMessage(
        form,
        "Email not found. Please check your email or create an account."
      );
      emailInput.focus();
      return;
    }

    // Sign-in successful - Load user data from registration
    try {
      // Set authentication flag in localStorage
      localStorage.setItem("luma_user_logged_in", "true");

      // Dispatch sign-in event
      const signInEvent = new CustomEvent("login", {
        detail: {
          email: enteredEmail,
          timestamp: new Date().toISOString(),
        },
        bubbles: true,
      });
      document.dispatchEvent(signInEvent);

      // Show success message
      showSuccessMessage(form, "Sign-in successful! Redirecting...");

      // Redirect to home page with language prefix
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      console.error("Sign-in error:", error);
      showErrorMessage(form, "Sign-in failed. Please try again.");
    }
  });
}

/**
 * Shows success message
 * @param {HTMLFormElement} form - The form element
 * @param {string} message - Success message
 */
function showSuccessMessage(form, message) {
  // Remove any existing messages
  const existingMessages = form.querySelectorAll(".form-message");
  existingMessages.forEach((msg) => msg.remove());

  const messageEl = document.createElement("div");
  messageEl.className = "form-message success";
  messageEl.textContent = message;
  messageEl.style.cssText = `
    padding: 15px;
    margin: 20px 0;
    background-color: #4caf50;
    color: white;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
    animation: slideDown 0.3s ease-out;
  `;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.parentNode.insertBefore(messageEl, submitButton);
    submitButton.disabled = true;
  } else {
    form.appendChild(messageEl);
  }
}

/**
 * Shows error message
 * @param {HTMLFormElement} form - The form element
 * @param {string} message - Error message
 */
function showErrorMessage(form, message) {
  // Remove any existing messages
  const existingMessages = form.querySelectorAll(".form-message");
  existingMessages.forEach((msg) => msg.remove());

  const messageEl = document.createElement("div");
  messageEl.className = "form-message error";
  messageEl.textContent = message;
  messageEl.style.cssText = `
    padding: 15px;
    margin: 20px 0;
    background-color: #f44336;
    color: white;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
    animation: slideDown 0.3s ease-out;
  `;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.parentNode.insertBefore(messageEl, submitButton);
  } else {
    form.appendChild(messageEl);
  }

  // Auto-remove error message after 5 seconds
  setTimeout(() => {
    messageEl.remove();
  }, 5000);
}

function addCreateAccountLink(block, isAuthor) {
  const formElement = block.querySelector("form");
  if (!formElement) return;

  // Create "Create account" link section
  const linkSection = document.createElement("div");
  linkSection.className = "sign-in-links";

  // Divider
  const divider = document.createElement("div");
  divider.className = "sign-in-divider";
  divider.innerHTML = "<span>or</span>";

  // Create account link with smart path construction
  const createAccountLink = document.createElement("a");
  createAccountLink.className = "create-account-link";
  createAccountLink.textContent = "Create an account";

  // Smart path construction
  const currentPath = window.location.pathname;
  let registrationPath;

  if (isAuthor) {
    // For author, replace 'sign-in.html' with 'registration.html'
    registrationPath = currentPath.replace(
      "/sign-in.html",
      "/registration.html"
    );
  } else {
    // For EDS publish, replace '/sign-in' with '/registration'
    registrationPath = currentPath.replace(
      /\/sign-in(\.html)?$/,
      "/registration"
    );
  }

  createAccountLink.href = registrationPath;

  linkSection.append(divider, createAccountLink);
  formElement.parentElement.append(linkSection);
}
