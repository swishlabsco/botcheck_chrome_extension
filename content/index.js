/**
 * /content/index.js
 *
 * The start point of the extension.
 */

console.log('(botcheck) Botcheck starting!');

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

// Load api key and whitelist from chrome storage
chrome.storage.sync.get(null, (state) => {
  console.log('Botcheck init - got state:');
  console.log(state);
  if (!state.apiKey) {
    // No API key found, ask user to login
    store.dispatch('AUTH_TWITTER');
  }
  if (state.apiKey) {
    store.commit('AUTH_APIKEY_SET', state.apiKey);
  }
  if (state.whitelist) {
    store.commit('WHITELIST_SET', { type: 'load', whitelist: state.whitelist });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.apiKey.newValue) {
    console.log('(botcheck) Detected new API key in storage');
    store.commit('AUTH_APIKEY_SET', changes.apiKey.newValue);
  }
});
