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

const SESSION_STORAGE_KEY = "luma_dataLayer";

/**
 * Deep merge utility function for nested objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge from
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
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
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(_dataLayer));
    console.log("All queued updates applied to dataLayer");

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

  // Persist to sessionStorage
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(_dataLayer));

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
    // Try to restore existing dataLayer from sessionStorage
    const savedDataLayer = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (savedDataLayer) {
      // Restore the saved dataLayer
      _dataLayer = JSON.parse(savedDataLayer);
      console.log("DataLayer restored from session:", _dataLayer);
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

    // Save updated dataLayer to sessionStorage
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(_dataLayer));
    console.log("DataLayer page info updated:", {
      title: _dataLayer.page.title,
      name: _dataLayer.page.name,
    });

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

  if (merge) {
    // Deep merge the updates with existing dataLayer
    _dataLayer = deepMerge(_dataLayer, updates);
  } else {
    // Replace specific properties
    _dataLayer = { ..._dataLayer, ...updates };
  }

  // Persist to sessionStorage
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(_dataLayer));
  console.log("DataLayer updated:", _dataLayer);

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
 */
window.clearDataLayer = function () {
  window._dataLayerQueue = [];
  window._cartQueue = [];
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  console.log("DataLayer and all queues cleared");
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
 * Get queue status for debugging
 * @returns {Object} Queue status
 */
window.getDataLayerQueueStatus = function () {
  return {
    ready: window._dataLayerReady,
    dataLayerQueueLength: window._dataLayerQueue
      ? window._dataLayerQueue.length
      : 0,
    cartQueueLength: window._cartQueue ? window._cartQueue.length : 0,
    dataLayerQueue: window._dataLayerQueue || [],
    cartQueue: window._cartQueue || [],
  };
};
