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
let begun = false;
function begin(apiKey) {
  // Always commit new API key
  store.commit('AUTH_APIKEY_SET', apiKey);

  // But only mount extension once
  if (begun) {
    return;
  }
  begun = true;

  // Load whitelist and stored results
  chrome.storage.local.get(null, (state) => {
    if (!state.whitelist) {
      state.whitelist = {};
    }
    store.dispatch('LOAD_WHITELIST', state.whitelist);

    if (!state.results) {
      state.results = {};
    }
    store.commit('LOAD_RESULTS', state.results);

    botcheckScanner.injectButtons();
    botcheckScanner.injectDialogs();
  });

  // Listen for whitelist changes and send updates to Vuex store
  chrome.storage.onChanged.addListener((changes /* , areaName */) => {
    if (changes.whitelist && changes.whitelist.newValue) {
      console.log('(botcheck) Detected whitelist change in storage');
      store.dispatch('LOAD_WHITELIST', changes.whitelist.newValue);
    }
  });

  // When tab goes into focus, load results from storage
  // (We could listen for results changes like we do for the whitelist,
  // but then the same tab would be sending a lot of updates to itself)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden === false) {
      chrome.storage.local.get('results', ({ results }) => {
        console.log('(botcheck) Detected page focus. Loading results.');
        store.commit('LOAD_RESULTS', results);
      });
    }
  });
}

// Try to load API key from browser storage
chrome.storage.local.get(null, (state) => {
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
