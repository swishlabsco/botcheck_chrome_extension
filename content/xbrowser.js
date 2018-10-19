/**
 * /content/xbrowser.js
 *
 * Wraps chrome/safari/firefox methods to do the right thing per browser.
 * Uses https://github.com/mozilla/webextension-polyfill internally to simplify things.
 * Most of these methods return promises, unlike the direct `chrome.*` methods.
 */

// TODO move into utils
function updateNestedKey(object, path, value) {
  /**
   * Updates a nested key in a object,
   * given a path ['in', 'this', 'format']
   * updates object.in.this.format to value.
   */
  if (!object || !path || path.length < 1) {
    return object;
  }
  if (path.length === 1) {
    object[path[0]] = value;
    return;
  }
  // Create path if it doesn't exist
  if (!object[path[0]]) {
    object[path[0]] = {};
  }
  return updateNestedKey(object[path[0]], path.slice(1), value);
}


(function() {

  const isSafari = 'safari' in window;
  const extensionBuildOutputFolder = 'build/'; // Where gulp outputs js/css folders relative to the xcode project.
  const safariExtensionHandlerMessages = {
    BC_OPEN_NEW_TAB: 'BC_OPEN_NEW_TAB'
  };

  BC.xbrowser = {
    storage: {
      /**
       * STORAGE
       */
      prefix: 'bce_', // only for safari since it uses localstorage
      get(key) {
        /**
         * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/get
         */
        console.assert(key === null || key.constructor === String);

        if (isSafari) {
          // Special case if "null" - return all data
          let data;

          if (key === null) {
            data = localStorage;
          }
          else {
            data = localStorage.getItem(this.prefix + key);
            data = JSON.parse(data);
          }

          return Promise.resolve(data);
        }

        return browser.storage.local.get(key);
      },
      set(keys) {
        /**
         * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/set
         */
        console.assert(keys.constructor === Object);

        if (isSafari) {
          // localStorage doesn't support setting multiple keys at once, so we do it manually.
          for (let [key, val] of Object.entries(keys)) {
            key = this.prefix + key;
            localStorage.setItem(key, JSON.stringify(val));
          }
          return Promise.resolve();
        }

        return browser.storage.local.set(keys);
      },
      queueSet(keyPath, value) {
        /**
         * Because chrome.storage.sync is throttled, we queue things for things that are rapid-fire updating.
         * - In non-safari it just wraps browser.runtime.sendMessage which the background script handles.
         * - In safari things use localstorage, so no need for this.
         */
        // TODO remove this once Marcos refactors this stuff.
        // throw Error('not implemented for now');

        console.assert(keyPath.constructor === Array);

        if (isSafari) {
          // Traverse tree to find right place to set value
          console.log('(botcheck) - queueSet', arguments);

          let firstKey = keyPath[0];
          let existing = JSON.parse(localStorage.get(firstKey)) || {};
          let data = updateNestedKey(existing, keyPath, value);

          console.log('(botcheck) - existing', existing);
          console.log('(botcheck) - new data', data);

          localStorage.setItem(firstKey, JSON.stringify(data));
          return;
        }

        browser.runtime.sendMessage({
          type: 'botcheck-storage-queue-update',
          key: keyPath,
          value: value
        });
      },
      onChanged(callback) {
        /**
         * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/onChanged
         */
        console.assert(callback.constructor === Function);

        if (isSafari) {
          // Try to mimic how chrome's onChanged.addListener works.
          window.addEventListener('storage', (event) => {
            let changes = {
              [event.key]: {
                oldValue: event.oldValue,
                newValue: event.newValue
              }
            };
            callback(changes)
          });
          return;
        }

        browser.storage.onChanged.addListener(callback);
      }
    },
    /**
     * EXTENSION HELPERS
     */
    extension: {
      getURL(path) {
        /**
         * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getURL
         * https://developer.apple.com/documentation/safariservices/safari_app_extensions/injecting_a_script_into_a_webpage
         */
        if (isSafari) {
          return safari.extension.baseURI + extensionBuildOutputFolder + path;
        }
        return browser.runtime.getURL(path);
      }
    },
    /**
     * TABS
     */
    tabs: {
      open(url) {
        console.log('(botcheck) xbrowser.tabs.open', url);

        if (isSafari) {
          // Call our Swift code.
          safari.extension.dispatchMessage(safariExtensionHandlerMessages.BC_OPEN_NEW_TAB, {
            url: url
          });
          return;
        }

        // This may not work unless the user clicked on something.
        // Maybe we should use browser.tabs.create?
        window.open(url);
      }
    }
  };

})();

