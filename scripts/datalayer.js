// ==========================================
// DataLayer Management System
// Standalone module for managing application data layer
// ==========================================

// Queue for dataLayer updates that occur before dataLayer is ready
window._dataLayerQueue = window._dataLayerQueue || [];
window._dataLayerReady = false;
window._dataLayerUpdating = false;

// Queue for cart operations that occur before dataLayer is ready
window._cartQueue = window._cartQueue || [];

// Private variable to store the actual dataLayer (will be set by buildCustomDataLayer)
let _dataLayer = null;

// Storage keys for dataLayer (using localStorage for persistence across sessions)
const STORAGE_KEY = "luma_dataLayer";
const STORAGE_TIMESTAMP_KEY = "luma_dataLayer_timestamp";
const STORAGE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds (cart persistence)

// Storage keys for checkout form data (separate from cart/dataLayer)
const CHECKOUT_STORAGE_KEY = "luma_checkout_data";
const CHECKOUT_TIMESTAMP_KEY = "luma_checkout_data_timestamp";
const CHECKOUT_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days - longer persistence for user info

/**
 * Deep merge utility function for nested objects
 * Handles null values correctly - replaces null with source value
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge from
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  // If target is null/undefined, return source
  if (!target) {
    return isObject(source) ? { ...source } : source;
  }
  
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        // If target[key] is null/undefined or not an object, replace with source
        if (!target[key] || !isObject(target[key])) {
          output[key] = { ...source[key] };
        } else {
          // Both are objects, deep merge them
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        // Primitive value or null, just replace
        output[key] = source[key];
      }
    });
  }
  return output;
}

/**
 * Check if value is a plain object
 * @param {*} item - Value to check
 * @returns {boolean}
 */
function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Dispatch dataLayer event
 * @param {string} eventType - Type of event (initialized, restored, updated)
 */
function dispatchDataLayerEvent(eventType = "initialized") {
  document.dispatchEvent(
    new CustomEvent("dataLayerUpdated", {
      bubbles: true,
      detail: {
        dataLayer: JSON.parse(JSON.stringify(_dataLayer)),
        type: eventType,
      },
    })
  );
}

/**
 * Process queued dataLayer updates
 */
function processDataLayerQueue() {
  if (window._dataLayerQueue && window._dataLayerQueue.length > 0) {
    console.log(
      `Processing ${window._dataLayerQueue.length} queued dataLayer update(s)`
    );

    // Process each queued update
    window._dataLayerQueue.forEach((queuedUpdate, index) => {
      const { updates, merge } = queuedUpdate;
      console.log(`Applying queued update ${index + 1}:`, updates);

      if (merge) {
        _dataLayer = deepMerge(_dataLayer, updates);
      } else {
        _dataLayer = { ..._dataLayer, ...updates };
      }
    });

    // Persist final state after all queued updates
    try {
      const now = Date.now().toString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_dataLayer));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, now);
    console.log("All queued updates applied to dataLayer");
    } catch (storageError) {
      console.warn("⚠ Could not persist dataLayer:", storageError.message);
    }

    // Clear the queue
    window._dataLayerQueue = [];

    // Dispatch single update event for all queued updates
    dispatchDataLayerEvent("updated");
  }
}

/**
 * Process queued cart operations
 */
function processCartQueue() {
  if (window._cartQueue && window._cartQueue.length > 0) {
    console.log(
      `Processing ${window._cartQueue.length} queued cart operation(s)`
    );

    // Process each queued cart operation
    window._cartQueue.forEach((cartOperation, index) => {
      console.log(
        `Applying queued cart operation ${index + 1}:`,
        cartOperation
      );

      // Execute the actual add to cart logic
      executeAddToCart(cartOperation);
    });

    // Clear the cart queue
    window._cartQueue = [];
    console.log("All queued cart operations applied");
  }
}

/**
 * Execute add to cart logic (used by both immediate and queued operations)
 * @param {Object} productData - Product information to add to cart
 */
function executeAddToCart(productData) {
  if (!_dataLayer) {
    console.error("DataLayer not available for cart operation");
    return;
  }

  // initialize empty cart with products as object
  let currentCart = {
    productCount: 0,
    products: {},
    subTotal: 0,
    total: 0,
  };

  // if cart already exists, use it
  if (Object.keys(_dataLayer.cart).length > 0) {
    currentCart = _dataLayer.cart;
  }

  // Use SKU or ID as the key
  const productKey = productData.id;

  // Check if product already exists in cart (simple object lookup)
  if (currentCart.products[productKey]) {
    // Product exists, increment quantity
    currentCart.products[productKey].quantity += productData.quantity || 1;
    currentCart.products[productKey].subTotal =
      currentCart.products[productKey].quantity *
      currentCart.products[productKey].price;
    currentCart.products[productKey].total =
      currentCart.products[productKey].subTotal;
  } else {
    // Add new product to cart as object property
    currentCart.products[productKey] = {
      id: productData.id,
      sku: productData.id,
      name: productData.name,
      images: productData.images,
      category: productData.category,
      description: productData.description,
      quantity: productData.quantity || 1,
      price: productData.price,
      subTotal: productData.price * (productData.quantity || 1),
      total: productData.price * (productData.quantity || 1),
    };
  }

  // Update cart totals by iterating over object values
  const productValues = Object.values(currentCart.products);
  currentCart.productCount = productValues.reduce(
    (sum, p) => sum + p.quantity,
    0
  );
  currentCart.subTotal = productValues.reduce((sum, p) => sum + p.subTotal, 0);
  currentCart.total = currentCart.subTotal;

  // Update dataLayer with new cart
  _dataLayer.cart = currentCart;

  // Persist to localStorage with timestamp
  try {
    const now = Date.now().toString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_dataLayer));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, now);
  } catch (storageError) {
    console.warn("⚠ Could not persist cart:", storageError.message);
  }

  console.log("Cart updated:", {
    productName: productData.name,
    productKey: productKey,
    productCount: currentCart.productCount,
    total: currentCart.total,
  });

  // Dispatch event
  dispatchDataLayerEvent("updated");
}

/**
 * Build and initialize the custom data layer
 * Called by delayed.js after it loads
 */
export function buildCustomDataLayer() {
  try {
    // Try to restore existing dataLayer from localStorage with TTL check
    const savedDataLayer = localStorage.getItem(STORAGE_KEY);
    const savedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

    // Check if saved data exists and is within TTL
    let isDataValid = false;
    if (savedDataLayer && savedTimestamp) {
      const cacheAge = Date.now() - parseInt(savedTimestamp, 10);
      if (cacheAge <= STORAGE_TTL) {
        isDataValid = true;
        const daysOld = Math.floor(cacheAge / (24 * 60 * 60 * 1000));
        console.log(
          `DataLayer restored from localStorage (${daysOld} day${
            daysOld !== 1 ? "s" : ""
          } old, TTL: 30 days)`
        );
      } else {
        console.log(
          `DataLayer cache expired (age: ${Math.floor(
            cacheAge / (24 * 60 * 60 * 1000)
          )} days, TTL: 30 days) - creating fresh dataLayer`
        );
        // Clear expired data
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      }
    }

    if (savedDataLayer && isDataValid) {
      // Restore the saved dataLayer
      _dataLayer = JSON.parse(savedDataLayer);
      console.log("DataLayer content:", _dataLayer);
    } else {
      // Create initial dataLayer if none exists
      _dataLayer = {
        projectName: "luma3",
        project: {
          id: "luma3",
          title: "Luma Website v3",
          template: "web-modular/empty-website-v2",
          locale: "en-US",
          currency: "USD",
        },
        page: { name: "home", title: "HOME" },
        cart: {},
        product: null, // Will be populated on product detail pages
        partnerData: {
          PartnerID: "Partner456",
          BrandLoyalist: 88,
          Seasonality: "Fall",
        },
      };
    }

    // Update page information from current document
    if (!_dataLayer.page) {
      _dataLayer.page = {};
    }
    _dataLayer.page.title = document.title;
    _dataLayer.page.name = document.title.toLowerCase();

    // Save updated dataLayer to localStorage with timestamp
    try {
      const now = Date.now().toString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_dataLayer));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, now);
    console.log("DataLayer page info updated:", {
      title: _dataLayer.page.title,
      name: _dataLayer.page.name,
    });
    } catch (storageError) {
      console.warn("⚠ Could not persist dataLayer:", storageError.message);
    }

    // Define window.dataLayer as a read-only property
    Object.defineProperty(window, "dataLayer", {
      get: function () {
        // Return a deep copy to prevent direct mutation of nested properties
        return JSON.parse(JSON.stringify(_dataLayer));
      },
      set: function (value) {
        // Prevent direct assignment and show error
        console.error(
          "❌ Direct assignment to window.dataLayer is not allowed. Please use window.updateDataLayer() instead."
        );
        console.trace("Stack trace:");
        throw new Error(
          "Direct modification of dataLayer is prohibited. Use updateDataLayer() method."
        );
      },
      configurable: false,
      enumerable: true,
    });

    // Mark dataLayer as ready
    window._dataLayerReady = true;

    // Process any queued updates
    processDataLayerQueue();

    // Process any queued cart operations
    processCartQueue();

    // Dispatch initial event after dataLayer is set up
    setTimeout(() => {
      dispatchDataLayerEvent(savedDataLayer ? "restored" : "initialized");
    }, 0);
  } catch (error) {
    console.error("Error initializing dataLayer:", error);

    // Fallback: create basic dataLayer
    _dataLayer = {
      projectName: "luma3",
      project: { id: "luma3" },
      page: {},
      cart: {},
      partnerData: {},
    };

    Object.defineProperty(window, "dataLayer", {
      get: function () {
        return JSON.parse(JSON.stringify(_dataLayer));
      },
      set: function () {
        console.error(
          "❌ Direct assignment to window.dataLayer is not allowed. Please use window.updateDataLayer() instead."
        );
      },
    });

    // Mark as ready and process queue even in fallback mode
    window._dataLayerReady = true;
    processDataLayerQueue();
  }
}

/**
 * Update dataLayer with new data
 * Available immediately on page load - queues if not ready
 * @param {Object} updates - Data to update
 * @param {boolean} merge - Whether to deep merge (true) or shallow merge (false)
 */
window.updateDataLayer = function (updates, merge = true) {
  if (!updates || typeof updates !== "object") {
    console.error("Invalid updates provided to updateDataLayer");
    return;
  }

  // Queue if not ready yet
  if (!window._dataLayerReady || !_dataLayer) {
    console.log("DataLayer not ready, queuing update:", updates);
    window._dataLayerQueue.push({ updates, merge });
    return;
  }

  // Set updating flag
  window._dataLayerUpdating = true;

  // Log what's being updated
  console.log(`Updating dataLayer (merge: ${merge}):`, updates);

  if (merge) {
    // Deep merge the updates with existing dataLayer
    _dataLayer = deepMerge(_dataLayer, updates);
  } else {
    // Replace specific properties
    _dataLayer = { ..._dataLayer, ...updates };
  }

  // Persist to localStorage with timestamp
  try {
    const now = Date.now().toString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_dataLayer));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, now);
    console.log("✓ DataLayer updated successfully");
    
    // Log specific properties that were updated
    if (updates.product) {
      console.log("→ Product info:", _dataLayer.product);
    }
    if (updates.cart) {
      console.log("→ Cart info: " + _dataLayer.cart.productCount + " items, $" + _dataLayer.cart.total);
    }
  } catch (storageError) {
    console.warn("⚠ Could not persist dataLayer:", storageError.message);
  }

  // Clear updating flag
  window._dataLayerUpdating = false;

  // Dispatch event to notify other components
  dispatchDataLayerEvent("updated");
};

/**
 * Get a specific property from dataLayer
 * @param {string} path - Dot-notation path (e.g., 'product.name')
 * @returns {*} The value at the path, or undefined
 */
window.getDataLayerProperty = function (path) {
  if (!_dataLayer) {
    console.warn("DataLayer not initialized yet");
    return undefined;
  }

  if (!path) return JSON.parse(JSON.stringify(_dataLayer));

  const keys = path.split(".");
  let value = _dataLayer;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  // Return deep copy if object, otherwise return value
  return typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
};

/**
 * Clear dataLayer and all queues
 * Note: Does NOT clear checkout form data (personal information)
 */
window.clearDataLayer = function () {
  window._dataLayerQueue = [];
  window._cartQueue = [];
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
  console.log("DataLayer and cart cleared from localStorage");
  console.log(
    "→ Checkout form data preserved (use clearCheckoutData() to clear)"
  );
};

/**
 * Save checkout form data to localStorage with TTL
 * This data persists separately from cart/dataLayer
 * @param {Object} formData - Checkout form data
 */
window.saveCheckoutData = function (formData) {
  if (!formData || typeof formData !== "object") {
    console.error("Invalid checkout data provided");
    return;
  }

  try {
    const now = Date.now().toString();
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(formData));
    localStorage.setItem(CHECKOUT_TIMESTAMP_KEY, now);
    console.log("✓ Checkout data saved to localStorage (90-day persistence)");
  } catch (storageError) {
    console.warn("⚠ Could not save checkout data:", storageError.message);
  }
};

/**
 * Load checkout form data from localStorage with TTL check
 * @returns {Object|null} Saved checkout data or null if expired/not found
 */
window.loadCheckoutData = function () {
  try {
    const savedData = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    const savedTimestamp = localStorage.getItem(CHECKOUT_TIMESTAMP_KEY);

    if (!savedData) {
      console.log("No saved checkout data found");
      return null;
    }

    // Check TTL if timestamp exists
    if (savedTimestamp) {
      const cacheAge = Date.now() - parseInt(savedTimestamp, 10);
      if (cacheAge > CHECKOUT_TTL) {
        const daysOld = Math.floor(cacheAge / (24 * 60 * 60 * 1000));
        console.log(
          `Checkout data expired (${daysOld} days old, TTL: 90 days) - clearing`
        );
        localStorage.removeItem(CHECKOUT_STORAGE_KEY);
        localStorage.removeItem(CHECKOUT_TIMESTAMP_KEY);
        return null;
      }

      const daysOld = Math.floor(cacheAge / (24 * 60 * 60 * 1000));
      console.log(
        `✓ Checkout data loaded (${daysOld} day${daysOld !== 1 ? "s" : ""} old)`
      );
    }

    return JSON.parse(savedData);
  } catch (error) {
    console.error("Error loading checkout data:", error.message);
    return null;
  }
};

/**
 * Clear checkout form data from localStorage
 * Separate function to explicitly clear user's personal information
 */
window.clearCheckoutData = function () {
  localStorage.removeItem(CHECKOUT_STORAGE_KEY);
  localStorage.removeItem(CHECKOUT_TIMESTAMP_KEY);
  console.log("✓ Checkout data cleared from localStorage");
};

/**
 * Add product to cart (queues if dataLayer not ready)
 * Products stored as object keyed by ID for easy lookup and duplicate prevention
 * @param {Object} productData - Product information
 * @param {string} productData.id - Product ID (used as key in cart.products object)
 * @param {string} productData.name - Product name
 * @param {string} productData.images - Product image URL
 * @param {string} productData.category - Product category
 * @param {string} productData.description - Product description
 * @param {number} productData.price - Product price
 * @param {number} productData.quantity - Quantity to add (default: 1)
 */
window.addToCart = function (productData) {
  if (!productData || !productData.id) {
    console.error("Invalid product data provided to addToCart");
    return;
  }

  // Queue if not ready yet
  if (!window._dataLayerReady || !_dataLayer) {
    console.log("DataLayer not ready, queuing cart operation:", productData);
    window._cartQueue.push(productData);
    return;
  }

  // Execute immediately if ready
  executeAddToCart(productData);
};

/**
 * Get queue status and storage info for debugging
 * @returns {Object} Queue status and storage information
 */
window.getDataLayerQueueStatus = function () {
  const checkoutData = localStorage.getItem(CHECKOUT_STORAGE_KEY);
  const checkoutTimestamp = localStorage.getItem(CHECKOUT_TIMESTAMP_KEY);

  let checkoutAge = null;
  if (checkoutTimestamp) {
    const ageMs = Date.now() - parseInt(checkoutTimestamp, 10);
    checkoutAge = `${Math.floor(ageMs / (24 * 60 * 60 * 1000))} days`;
  }

  return {
    ready: window._dataLayerReady,
    dataLayerQueueLength: window._dataLayerQueue
      ? window._dataLayerQueue.length
      : 0,
    cartQueueLength: window._cartQueue ? window._cartQueue.length : 0,
    dataLayerQueue: window._dataLayerQueue || [],
    cartQueue: window._cartQueue || [],
    checkoutDataSaved: !!checkoutData,
    checkoutDataAge: checkoutAge,
  };
};

// ==========================================
// Custom Events Management
// ==========================================

/**
 * Fetches and caches custom events configuration with conditional request support
 * Uses Last-Modified header to check if config has been updated
 * Uses localStorage with TTL for persistence across sessions
 * @returns {Promise<Object|null>} Custom events configuration
 */
async function loadCustomEventsConfig() {
  const EVENTS_STORAGE_KEY = "luma_customEventsConfig";
  const EVENTS_LAST_MODIFIED_KEY = "luma_customEventsConfig_lastModified";
  const EVENTS_TIMESTAMP_KEY = "luma_customEventsConfig_timestamp";
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  try {
    // Get cached configuration from localStorage
    let cachedConfig = localStorage.getItem(EVENTS_STORAGE_KEY);
    let cachedLastModified = localStorage.getItem(EVENTS_LAST_MODIFIED_KEY);
    let cacheTimestamp = localStorage.getItem(EVENTS_TIMESTAMP_KEY);

    // Check if cache has expired (TTL check)
    if (cachedConfig && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
      if (cacheAge > CACHE_TTL) {
        console.log(
          `Cache expired (age: ${Math.round(
            cacheAge / 1000 / 60
          )} minutes, TTL: ${CACHE_TTL / 1000 / 60} minutes)`
        );
        // Don't clear cache yet - use as fallback if fetch fails
      }
    }

    // Prepare fetch options with conditional request if we have cached data
    const fetchOptions = {
      method: "GET",
      headers: {},
    };

    if (cachedConfig && cachedLastModified) {
      // Use If-Modified-Since header for conditional GET request
      fetchOptions.headers["If-Modified-Since"] = cachedLastModified;
      console.log("Checking if custom events config has been modified...");
    } else {
      console.log("Fetching custom events config from server (no cache)...");
    }

    // Fetch the custom-events.json file (conditional request if cached)
    const response = await fetch("/custom-events.json", fetchOptions);

    // If 304 Not Modified, return cached config (most efficient - no body transferred)
    if (response.status === 304) {
      console.log(
        "✓ Custom events config: Not modified (HTTP 304), using cache"
      );

      // Update timestamp to extend TTL
      const now = Date.now().toString();
      localStorage.setItem(EVENTS_TIMESTAMP_KEY, now);

      return JSON.parse(cachedConfig);
    }

    // Handle HTTP errors with detailed logging
    if (!response.ok) {
      const errorType =
        response.status >= 500
          ? "Server Error"
          : response.status === 404
          ? "Not Found"
          : response.status >= 400
          ? "Client Error"
          : "Unknown Error";

      console.warn(
        `✗ Failed to fetch config: ${errorType} (HTTP ${response.status})`
      );

      // If we have cached config, return it as fallback
      if (cachedConfig) {
        console.warn("→ Using cached version as fallback");
        return JSON.parse(cachedConfig);
      }

      console.warn("→ No cached config available");
      return null;
    }

    // Parse and validate the response
    let config;
    try {
      config = await response.json();
    } catch (parseError) {
      console.error("✗ JSON parsing error:", parseError.message);

      // Return cached config if parsing fails
      if (cachedConfig) {
        console.warn("→ Using cached version due to parsing error");
        return JSON.parse(cachedConfig);
      }

      throw parseError;
    }

    // Validate config structure
    if (!config || typeof config !== "object") {
      console.error("✗ Invalid config structure received");

      if (cachedConfig) {
        console.warn("→ Using cached version due to invalid structure");
        return JSON.parse(cachedConfig);
      }

      return null;
    }

    const lastModified = response.headers.get("Last-Modified");
    const now = Date.now().toString();

    // Cache the configuration in localStorage
    const configString = JSON.stringify(config);

    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, configString);
      localStorage.setItem(EVENTS_TIMESTAMP_KEY, now);
      if (lastModified) {
        localStorage.setItem(EVENTS_LAST_MODIFIED_KEY, lastModified);
      }

      console.log(
        `✓ Custom events config cached to localStorage${
          lastModified ? ` (Last-Modified: ${lastModified})` : ""
        }`
      );
    } catch (storageError) {
      // localStorage might be full or disabled
      console.warn("⚠ Could not cache to localStorage:", storageError.message);
    }

    return config;
  } catch (error) {
    // Differentiate error types for better debugging
    const errorType =
      error.name === "TypeError"
        ? "Network Error"
        : error.name === "SyntaxError"
        ? "JSON Parse Error"
        : error.name === "AbortError"
        ? "Request Aborted"
        : error.name;

    console.error(
      `✗ Error loading custom events config (${errorType}):`,
      error.message
    );

    // Return cached config as fallback if available
    const cachedConfig = localStorage.getItem(EVENTS_STORAGE_KEY);

    if (cachedConfig) {
      console.log("→ Using cached config from localStorage as fallback");
      try {
        return JSON.parse(cachedConfig);
      } catch (parseError) {
        console.error("✗ Failed to parse cached config:", parseError.message);
        return null;
      }
    }

    console.warn("→ No cached config available");
    return null;
  }
}

/**
 * Checks if current page matches the page pattern
 * @param {string} pagePattern - Page pattern to match (*, exact path, or wildcard)
 * @param {string} currentPath - Current page path
 * @returns {boolean} True if page matches
 */
function matchesPagePattern(pagePattern, currentPath) {
  if (!pagePattern || pagePattern === "*") {
    return true; // Match all pages
  }

  // Handle query string patterns
  const currentFullPath = window.location.pathname + window.location.search;

  // Exact match (check both with and without query string)
  if (pagePattern === currentPath || pagePattern === currentFullPath) {
    return true;
  }

  // Wildcard/regex pattern match
  if (pagePattern.includes("*") || pagePattern.includes("?")) {
    const regexPattern = pagePattern
      .replace(/\*/g, ".*")
      .replace(/\?/g, "\\?")
      .replace(/\//g, "\\/");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(currentPath) || regex.test(currentFullPath);
  }

  return false;
}

/**
 * Checks if current page is excluded
 * @param {string} excludes - Comma-separated list of excluded paths
 * @param {string} currentPath - Current page path
 * @returns {boolean} True if page is excluded
 */
function isPageExcluded(excludes, currentPath) {
  if (!excludes) return false;

  const excludeList = excludes.split(",").map((path) => path.trim());
  const currentFullPath = window.location.pathname + window.location.search;

  return excludeList.some((excludePath) => {
    // Exact match
    if (excludePath === currentPath || excludePath === currentFullPath) {
      return true;
    }

    // Check if exclude path is a regex pattern
    if (excludePath.includes("*") || excludePath.includes("?")) {
      const regexPattern = excludePath
        .replace(/\*/g, ".*")
        .replace(/\?/g, "\\?")
        .replace(/\//g, "\\/");
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(currentPath) || regex.test(currentFullPath);
    }

    return false;
  });
}

/**
 * Dispatches a custom event
 * @param {string} eventName - Name of the event
 * @param {Object} eventConfig - Event configuration
 * @param {string} pagePath - Current page path
 * @param {Object} additionalDetail - Additional event details (unused, kept for compatibility)
 */
function dispatchCustomEvent(
  eventName,
  eventConfig,
  pagePath,
  additionalDetail = {}
) {
  const customEvent = new CustomEvent(eventName, {
    bubbles: true,
  });
  console.log(
    `Dispatching custom event: ${eventName}, dataLayer: `,
    window.dataLayer
  );
  document.dispatchEvent(customEvent);
}

/**
 * Triggers custom events based on current page and configuration
 * Only executes when dataLayer is ready, stable, and queue is processed
 * @param {Object} config - Custom events configuration
 * @param {string} currentPath - Optional current path (defaults to window.location.pathname)
 */
function triggerCustomEvents(config = null, currentPath = null) {
  // Wait for dataLayer to be ready and stable
  if (!window.dataLayer || !window._dataLayerReady) {
    console.warn("DataLayer not ready yet, waiting...");
    // Retry after a short delay
    setTimeout(() => triggerCustomEvents(config, currentPath), 100);
    return;
  }

  // Check if queue is still being processed
  if (window._dataLayerQueue && window._dataLayerQueue.length > 0) {
    console.log(
      `DataLayer queue not empty (${window._dataLayerQueue.length} updates), deferring custom events...`
    );
    // Wait for queue to be processed
    setTimeout(() => triggerCustomEvents(config, currentPath), 100);
    return;
  }

  // Check if dataLayer is being updated
  if (window._dataLayerUpdating) {
    console.log("DataLayer is being updated, deferring custom events...");
    // Wait for update to complete
    document.addEventListener(
      "dataLayerUpdated",
      () => {
        triggerCustomEvents(config, currentPath);
      },
      { once: true }
    );
    return;
  }

  // Get or use provided configuration
  if (!config) {
    const cachedConfig = localStorage.getItem("luma_customEventsConfig");
    if (!cachedConfig) {
      console.warn("No custom events configuration available");
      return;
    }
    config = JSON.parse(cachedConfig);
  }

  const pagePath = currentPath || window.location.pathname;

  // Store event listeners for cleanup
  if (!window._customEventListeners) {
    window._customEventListeners = new Map();
  }

  // Process each event configuration in the data array
  if (config.data && Array.isArray(config.data)) {
    config.data.forEach((eventConfig, index) => {
      const {
        page,
        excludes,
        event,
        trigger = "pageload",
        element = "",
      } = eventConfig;

      // Skip if event name is not defined
      if (!event) {
        console.warn("Event name not defined in config:", eventConfig);
        return;
      }

      // Check if current page is excluded
      if (isPageExcluded(excludes, pagePath)) {
        console.log(`Page ${pagePath} is excluded from event: ${event}`);
        return;
      }

      // Check if current page matches the page pattern
      const shouldExecute = matchesPagePattern(page, pagePath);

      if (!shouldExecute) {
        return;
      }

      // Handle different trigger types
      switch (trigger.toLowerCase()) {
        case "pageload":
        case "domcontentloaded":
          // Dispatch immediately on page load
          console.log(
            `Executing pageload event: ${event} for page: ${pagePath}`
          );
          dispatchCustomEvent(event, eventConfig, pagePath);
          break;

        case "click":
          // Attach click event listener using event delegation
          if (!element) {
            console.warn(
              `Click trigger requires 'element' selector for event: ${event}`
            );
            return;
          }

          console.log(
            `Setting up delegated click event: ${event} for selector: ${element}`
          );

          // Create unique key for this event listener
          const listenerKey = `${event}_${index}_${element}`;

          // Remove old listener if exists (prevent duplicates)
          if (window._customEventListeners.has(listenerKey)) {
            const oldListener = window._customEventListeners.get(listenerKey);
            document.removeEventListener("click", oldListener.handler);
          }

          // Event Delegation Pattern: Attach listener to document instead of individual elements
          // This ensures the event works even for elements added dynamically after page load
          // Benefits:
          // 1. Works with dynamically added elements (no need to re-bind)
          // 2. Single listener instead of multiple (better performance)
          // 3. Automatically handles elements that are removed/added
          const delegatedHandler = function (clickEvent) {
            // Use closest() to handle clicks on nested elements within the target
            const matchedElement = clickEvent.target.closest(element);

            // Check if click occurred on or within the target element
            if (matchedElement) {
              console.log(
                `Click detected on element for event: ${event}`,
                matchedElement
              );

              // Dispatch the custom event with full context
              dispatchCustomEvent(event, eventConfig, pagePath, {
                clickedElement: matchedElement,
                clickEvent: {
                  target: clickEvent.target,
                  currentTarget: matchedElement,
                  type: clickEvent.type,
                  timeStamp: clickEvent.timeStamp,
                },
              });
            }
          };

          // Attach the delegated listener to document
          document.addEventListener("click", delegatedHandler);

          // Store listener for cleanup
          window._customEventListeners.set(listenerKey, {
            handler: delegatedHandler,
            selector: element,
          });

          console.log(
            `Delegated click listener attached for event: ${event} on selector: ${element}`
          );
          break;

        case "load":
          // Trigger on window load (all resources loaded)
          if (document.readyState === "complete") {
            dispatchCustomEvent(event, eventConfig, pagePath);
          } else {
            window.addEventListener(
              "load",
              () => {
                if (shouldExecute) {
                  dispatchCustomEvent(event, eventConfig, pagePath);
                }
              },
              { once: true }
            );
          }
          break;

        default:
          console.warn(`Unknown trigger type: ${trigger} for event: ${event}`);
      }
    });
  }
}

/**
 * Cleanup all custom event listeners (useful when navigating away)
 * Removes all delegated event listeners to prevent memory leaks
 */
function cleanupCustomEventListeners() {
  if (window._customEventListeners) {
    window._customEventListeners.forEach((listenerData, key) => {
      // Remove delegated listener from document
      if (listenerData.handler) {
        document.removeEventListener("click", listenerData.handler);
        console.log(
          `Removed delegated listener for: ${key} (${listenerData.selector})`
        );
      }
    });
    window._customEventListeners.clear();
    console.log("All custom event listeners cleaned up");
  }
}

/**
 * Initializes custom events system
 * Loads configuration once and triggers events for current page
 */
export async function initializeCustomEvents() {
  try {
    // Load custom events configuration (from cache or server)
    const config = await loadCustomEventsConfig();

    if (!config) {
      console.warn("Could not initialize custom events");
      return;
    }

    // Wait for dataLayer to be ready AND queue to be processed before triggering events
    const checkDataLayerReady = () => {
      // Check all conditions:
      // 1. DataLayer exists
      // 2. DataLayer is ready (initialized/restored)
      // 3. Queue is empty (all queued updates have been processed)
      // 4. DataLayer is not currently being updated
      if (
        window.dataLayer &&
        window._dataLayerReady &&
        (!window._dataLayerQueue || window._dataLayerQueue.length === 0) &&
        !window._dataLayerUpdating
      ) {
        console.log(
          "DataLayer ready and queue processed, triggering custom events"
        );
        triggerCustomEvents(config);
      } else {
        // Log status for debugging
        if (!window.dataLayer) {
          console.log("Waiting for dataLayer to exist...");
        } else if (!window._dataLayerReady) {
          console.log("Waiting for dataLayer to be ready...");
        } else if (
          window._dataLayerQueue &&
          window._dataLayerQueue.length > 0
        ) {
          console.log(
            `Waiting for queue to be processed (${window._dataLayerQueue.length} updates pending)...`
          );
        } else if (window._dataLayerUpdating) {
          console.log("Waiting for dataLayer update to complete...");
        }
        setTimeout(checkDataLayerReady, 50);
      }
    };

    checkDataLayerReady();
  } catch (error) {
    console.error("Error initializing custom events:", error);
  }
}

// Make functions globally accessible
window.triggerCustomEvents = triggerCustomEvents;
window.cleanupCustomEventListeners = cleanupCustomEventListeners;

// ==========================================
// Auto-initialize DataLayer and Custom Events
// Initialize immediately when module loads (not delayed)
// This ensures dataLayer is available as soon as scripts.js loads
// Custom events also initialize early to catch page load events
// ==========================================
buildCustomDataLayer();

// Initialize custom events system (async - won't block)
// With caching, this is usually instant on subsequent loads
initializeCustomEvents();
