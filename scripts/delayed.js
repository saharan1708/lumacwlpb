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

      // Save initial dataLayer to sessionStorage
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(_dataLayer));
      console.log("DataLayer initialized:", _dataLayer);
    }

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

    // Dispatch initial event after dataLayer is set up
    // Use setTimeout to ensure event listeners have time to attach
    setTimeout(() => {
      dispatchDataLayerEvent(savedDataLayer ? "restored" : "initialized");
    }, 0);

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
      console.log("DataLayer cleared from session");
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

    window.updateDataLayer = function (updates) {
      _fallbackDataLayer = { ..._fallbackDataLayer, ...updates };
    };
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
 * Fetches and processes custom events configuration
 * Executes custom events based on page matching logic with exclusions
 */
async function loadCustomEvents() {
  buildCustomDataLayer();
  try {
    // Fetch the custom-events.json file
    const response = await fetch("/custom-events.json");
    if (!response.ok) {
      console.warn("Custom events configuration not found");
      return;
    }

    const config = await response.json();
    const currentPath = window.location.pathname;

    // Process each event configuration in the data array
    if (config.data && Array.isArray(config.data)) {
      config.data.forEach((eventConfig) => {
        const { page, excludes, event } = eventConfig;

        // Skip if event name is not defined
        if (!event) return;

        // Check if current page matches the exclusion list
        if (excludes) {
          const excludeList = excludes.split(",").map((path) => path.trim());
          const isExcluded = excludeList.some((excludePath) => {
            // Exact match or regex pattern match
            if (excludePath === currentPath) return true;
            // Check if exclude path is a regex pattern
            if (excludePath.includes("*")) {
              const regexPattern = excludePath
                .replace(/\*/g, ".*")
                .replace(/\//g, "\\/");
              const regex = new RegExp(`^${regexPattern}$`);
              return regex.test(currentPath);
            }
            return false;
          });

          if (isExcluded) {
            console.log(`Page ${currentPath} is excluded from event: ${event}`);
            return;
          }
        }

        // Check if current page matches the page pattern
        let shouldExecute = false;

        if (page === "*") {
          // Match all pages
          shouldExecute = true;
        } else if (page === currentPath) {
          // Exact match
          shouldExecute = true;
        } else if (page.includes("*")) {
          // Wildcard/regex pattern match
          const regexPattern = page.replace(/\*/g, ".*").replace(/\//g, "\\/");
          const regex = new RegExp(`^${regexPattern}$`);
          shouldExecute = regex.test(currentPath);
        }

        // Execute the custom event if conditions match
        if (shouldExecute) {
          console.log(
            `Executing custom event: ${event} for page: ${currentPath}`
          );

          // Dispatch custom event
          const customEvent = new CustomEvent(event, {
            bubbles: true,
          });
          console.log("Dispatching custom event:", customEvent);
          document.dispatchEvent(customEvent);
        }
      });
    }
  } catch (error) {
    console.error("Error loading custom events:", error);
  }
}

if (!window.location.hostname.includes("localhost")) {
  embedCustomLibraries();
  if (!(window.location.href.indexOf("/canvas/") > -1)) {
    loadAT();
  }
}

// Load custom events
loadCustomEvents();
