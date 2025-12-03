// ==========================================
// Custom Events Management System
// Handles custom event tracking and dispatching
// Loaded from delayed.js to not block page load
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
    }

    // Fetch the custom-events.json file (conditional request if cached)
    const response = await fetch("/custom-events.json", fetchOptions);

    // If 304 Not Modified, return cached config (most efficient - no body transferred)
    if (response.status === 304) {
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
      try {
        return JSON.parse(cachedConfig);
      } catch (parseError) {
        console.error("✗ Failed to parse cached config:", parseError.message);
        return null;
      }
    }

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
    // Wait for queue to be processed
    setTimeout(() => triggerCustomEvents(config, currentPath), 100);
    return;
  }

  // Check if dataLayer is being updated
  if (window._dataLayerUpdating) {
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
      }
    });
    window._customEventListeners.clear();
  }
}

/**
 * Initializes custom events system
 * Loads configuration once and triggers events for current page
 * Called from delayed.js after page load to not block critical rendering
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
        triggerCustomEvents(config);
      } else {
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
