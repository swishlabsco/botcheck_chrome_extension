/**
 * /content/index.js
 *
 * The start point of the extension.
 */

// Send any uncaught exceptions up to log collector
Vue.config.errorHandler = (error, vm, info) => {
  console.error('(Vue error handler) Dispatching log:');
  console.error(error);
  store.dispatch('LOG', {
    message: error.message,
    stack: error.stack,
    error: error.error,
    filename: error.filename,
    vueInfo: info
  });
};

// Load api key and whitelist from chrome storage on startup
chrome.storage.sync.get(null, (state) => {
  if (!state.apiKey) {
    // No API key found, ask user to login
    store.commit('AUTH_TWITTER');
  }
  if (state.apiKey) {
    store.commit('AUTH_APIKEY_SET', state.apiKey);
  }
  if (state.whitelist) {
    store.commit('WHITELIST_SET', { type: 'load', whitelist: state.whitelist });
  }
});

// Save api key to chrome storage when API key changes
store.subscribe((mutation, state) => {
  if (mutation.type === 'AUTH_APIKEY_SET' && mutation.payload) {
    chrome.storage.sync.set({ apiKey: mutation.payload });
  } else if (mutation.type === 'WHITELIST_SET') {
    chrome.storage.sync.set({ whitelist: state.whitelist });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Chrome storage changed:\nchanges:');
  console.log(changes);
  console.log('areaName:');
  console.log(areaName);
});
