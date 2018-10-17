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

// Called when an API key is retrieved
function begin(apiKey) {
  store.commit('AUTH_APIKEY_SET', apiKey);

  // Load whitelist and stored results
  chrome.storage.sync.get(null, (state) => {
    if (state.whitelist) {
      store.dispatch('LOAD_WHITELIST', state.whitelist);
    }
    if (state.results) {
      store.commit('LOAD_RESULTS', state.results);
    }
    botcheckScanner.injectButtons();
    botcheckScanner.injectDialogs();
  });

  // Listen for whitelist and result changes and update Vuex store
  chrome.storage.onChanged.addListener((changes /* , areaName */) => {
    if (changes.whitelist && changes.whitelist.newValue) {
      console.log('(botcheck) Detected whitelist change in storage');
      store.dispatch('LOAD_WHITELIST', changes.whitelist.newValue);
    }
    if (changes.results && changes.results.newValue) {
      console.log('(botcheck) Detected results change in storage');
      store.commit('LOAD_RESULTS', changes.results.newValue);
    }
  });
}

// Try to load API key from browser storage
chrome.storage.sync.get(null, (state) => {
  console.log('(botcheck) Starting... Got state:');
  console.log(state);
  if (!state.apiKey) {
    // No API key found, ask user to login
    // and do nothing until API key is received
    store.dispatch('AUTH_TWITTER');
    return;
  }
  begin(state.apiKey);
});

// Listen for API key from the tab used for authentication
chrome.storage.onChanged.addListener((changes /* , areaName */) => {
  if (changes.apiKey && changes.apiKey.newValue) {
    console.log('(botcheck) Detected new API key in storage');
    begin(changes.apiKey.newValue);
  }
});
