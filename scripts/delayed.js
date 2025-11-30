// add delayed functionality here
import {
  getMetadata,
  loadScript,
  fetchPlaceholders,
  sampleRUM,
} from "./aem.js";
import { a, span, i } from "./dom-helpers.js";
import { isInternalPage } from "./utils.js";

// Adobe Target - start

window.targetGlobalSettings = {
  bodyHidingEnabled: false,
};

function loadAT() {
  function targetPageParams() {
    return {
      at_property: "549d426b-0bcc-be60-ce27-b9923bfcad4f",
    };
  }
  loadScript(window.hlx.codeBasePath + "/scripts/at-lsig.js");
}
// Adobe Target - end

// refactor tweetable links function
/**
 * Opens a popup for the Twitter links autoblock.
 */
function openPopUp(popUrl) {
  const popupParams =
    `height=450, width=550, top=${window.innerHeight / 2 - 275}` +
    `, left=${window.innerWidth / 2 - 225}` +
    ", toolbar=0, location=0, menubar=0, directories=0, scrollbars=0";
  window.open(popUrl, "fbShareWindow", popupParams);
}

/**
 * Finds and embeds custom JS and css
 */
function embedCustomLibraries() {
  const externalLibs = getMetadata("js-files");
  const libsArray = externalLibs?.split(",").map((url) => url.trim());

  libsArray.forEach((url, index) => {
    //console.log(`Loading script ${index + 1}: ${url}`);
    loadScript(`${url}`);
  });
}

/**
 * Finds and decorates anchor elements with Twitter hrefs
 */
function buildTwitterLinks() {
  const main = document.querySelector("main");
  if (!main) return;

  // get all paragraph elements
  const paras = main.querySelectorAll("p");
  const url = window.location.href;
  const encodedUrl = encodeURIComponent(url);

  [...paras].forEach((paragraph) => {
    const tweetables = paragraph.innerHTML.match(
      /&lt;tweetable[^>]*&gt;([\s\S]*?)&lt;\/tweetable&gt;/g
    );
    if (tweetables) {
      tweetables.forEach((tweetableTag) => {
        const matchedContent = tweetableTag.match(
          /&lt;tweetable(?:[^>]*data-channel=['"]([^'"]*)['"])?(?:[^>]*data-hashtag=['"]([^'"]*)['"])?[^>]*&gt;([\s\S]*?)&lt;\/tweetable&gt;/
        );
        const channel = matchedContent[1] || "";
        const hashtag = matchedContent[2] || "";
        const tweetContent = matchedContent[3];

        let modalURL =
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            tweetContent
          )}` + `&original_referrer=${encodedUrl}&source=tweetbutton`;
        if (channel)
          modalURL += `&via=${encodeURIComponent(
            channel.charAt(0) === "@" ? channel.substring(1) : channel
          )}`;
        if (hashtag) modalURL += `&hashtags=${encodeURIComponent(hashtag)}`;

        const tweetableEl = span(
          { class: "tweetable" },
          a(
            { href: modalURL, target: "_blank", tabindex: 0 },
            tweetContent,
            i({ class: "lp lp-twit" })
          )
        );
        paragraph.innerHTML = paragraph.innerHTML.replace(
          tweetableTag,
          tweetableEl.outerHTML
        );
      });
    }
    [...paragraph.querySelectorAll(".tweetable > a")].forEach(
      (twitterAnchor) => {
        twitterAnchor.addEventListener("click", (event) => {
          event.preventDefault();
          const apiURL = twitterAnchor.href;
          openPopUp(apiURL);
        });
      }
    );
  });
}
// Queue for dataLayer updates that occur before dataLayer is ready
window._dataLayerQueue = window._dataLayerQueue || [];
window._dataLayerReady = false;

/**
 * Builds the custom data layer
 * Persists and restores dataLayer across page navigations using sessionStorage
 * Enforces immutability - developers must use updateDataLayer() to modify data
 */
function buildCustomDataLayer() {
  const SESSION_STORAGE_KEY = "luma_dataLayer";

  try {
    // Private variable to store the actual dataLayer
    let _dataLayer;

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

    // Helper function to dispatch dataLayer event
    const dispatchDataLayerEvent = (eventType = "initialized") => {
      document.dispatchEvent(
        new CustomEvent("dataLayerUpdated", {
          bubbles: true,
          detail: {
            dataLayer: JSON.parse(JSON.stringify(_dataLayer)),
            type: eventType, // 'initialized', 'restored', or 'updated'
          },
        })
      );
    };

    // Mark dataLayer as ready
    window._dataLayerReady = true;

    // Process any queued updates
    processDataLayerQueue();

    // Dispatch initial event after dataLayer is set up
    // Use setTimeout to ensure event listeners have time to attach
    setTimeout(() => {
      dispatchDataLayerEvent(savedDataLayer ? "restored" : "initialized");
    }, 0);

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
      configurable: false, // Prevents property from being deleted or redefined
      enumerable: true, // Makes it visible in for...in loops
    });

    // Helper function to update and persist dataLayer
    window.updateDataLayer = function (updates, merge = true) {
      if (!updates || typeof updates !== "object") {
        console.error("Invalid updates provided to updateDataLayer");
        return;
      }

      // If dataLayer is not ready yet, queue the update
      if (!window._dataLayerReady) {
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

    // Helper function to get a specific property from dataLayer
    window.getDataLayerProperty = function (path) {
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
      return typeof value === "object"
        ? JSON.parse(JSON.stringify(value))
        : value;
    };

    // Helper function to clear dataLayer (useful for testing or logout)
    window.clearDataLayer = function () {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window._dataLayerQueue = [];
      console.log("DataLayer cleared from session");
    };

    // Helper function to check queue status
    window.getDataLayerQueueStatus = function () {
      return {
        ready: window._dataLayerReady,
        queueLength: window._dataLayerQueue ? window._dataLayerQueue.length : 0,
        queue: window._dataLayerQueue || [],
      };
    };
  } catch (error) {
    console.error("Error initializing dataLayer:", error);
    // Fallback: create basic dataLayer without persistence
    let _fallbackDataLayer = {
      projectName: "luma3",
      project: { id: "luma3" },
      page: {},
      cart: {},
      partnerData: {},
    };

    Object.defineProperty(window, "dataLayer", {
      get: function () {
        return JSON.parse(JSON.stringify(_fallbackDataLayer));
      },
      set: function () {
        console.error(
          "❌ Direct assignment to window.dataLayer is not allowed. Please use window.updateDataLayer() instead."
        );
      },
    });

    window.updateDataLayer = function (updates, merge = true) {
      // If not ready, queue the update
      if (!window._dataLayerReady) {
        console.log(
          "DataLayer not ready (fallback mode), queuing update:",
          updates
        );
        window._dataLayerQueue.push({ updates, merge });
        return;
      }

      if (merge) {
        _fallbackDataLayer = deepMerge(_fallbackDataLayer, updates);
      } else {
        _fallbackDataLayer = { ..._fallbackDataLayer, ...updates };
      }
    };

    // Mark as ready and process queue even in fallback mode
    window._dataLayerReady = true;
    if (window._dataLayerQueue && window._dataLayerQueue.length > 0) {
      console.log(
        `Processing ${window._dataLayerQueue.length} queued updates (fallback mode)`
      );
      window._dataLayerQueue.forEach(({ updates, merge }) => {
        if (merge) {
          _fallbackDataLayer = deepMerge(_fallbackDataLayer, updates);
        } else {
          _fallbackDataLayer = { ..._fallbackDataLayer, ...updates };
        }
      });
      window._dataLayerQueue = [];
    }
  }
}

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
 * Fetches and caches custom events configuration (loads once per session)
 * @returns {Promise<Object|null>} Custom events configuration
 */
async function loadCustomEventsConfig() {
  const EVENTS_STORAGE_KEY = "luma_customEventsConfig";

  try {
    // Try to get cached configuration from sessionStorage
    const cachedConfig = sessionStorage.getItem(EVENTS_STORAGE_KEY);

    if (cachedConfig) {
      console.log("Custom events config loaded from session cache");
      return JSON.parse(cachedConfig);
    }

    // Fetch the custom-events.json file if not cached
    console.log("Fetching custom events config from server...");
    const response = await fetch("/custom-events.json");

    if (!response.ok) {
      console.warn("Custom events configuration not found");
      return null;
    }

    const config = await response.json();

    // Cache the configuration in sessionStorage
    sessionStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(config));
    console.log("Custom events config cached for session");

    return config;
  } catch (error) {
    console.error("Error loading custom events config:", error);
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
    const cachedConfig = sessionStorage.getItem("luma_customEventsConfig");
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
async function initializeCustomEvents() {
  buildCustomDataLayer();

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

if (!window.location.hostname.includes("localhost")) {
  embedCustomLibraries();
  if (!(window.location.href.indexOf("/canvas/") > -1)) {
    loadAT();
  }
}

// Initialize custom events system
initializeCustomEvents();
