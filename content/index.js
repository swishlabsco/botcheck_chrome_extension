/**
 * /content/index.js
 *
 * The start point of the extension.
 */

function mergeNewResults(incoming) {
  const newResults = {};
  Object.keys(incoming).forEach((key) => {
    if (
      incoming[key].prediction !== true
      && incoming[key].prediction !== false
    ) {
      // New result doesn't say anything,
      // Account is private or server errored
      return;
    }
    if (
      !store.state.results[key] // If new result
      || !store.state.results[key].deepScan // or if old result is light scan
      || incoming[key].deepScan // or if new result is deep scan
    ) {
      newResults[key] = incoming[key];
    }
  });
  store.commit('LOAD_RESULTS', Object.assign(store.state.results, newResults));
}

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
  chrome.storage.sync.get(null, (state) => {
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

  // Listen for whitelist/results changes and send updates to Vuex store
  chrome.storage.onChanged.addListener((changes /* , areaName */) => {
    if (changes.whitelist && changes.whitelist.newValue) {
      console.log('(botcheck) Detected whitelist change in storage');
      store.dispatch('LOAD_WHITELIST', changes.whitelist.newValue);
    }
    if (changes.results && changes.results.newValue) {
      console.log('(botcheck) Detected results change in storage');

      // Merge in new results to make sure that even if updates arrive
      // out of order (looking at you chrome) no entries are missed
      mergeNewResults(changes.results.newValue);
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
