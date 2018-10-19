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
  if (begun) return;
  begun = true;

  // Load whitelist and stored results
  BC.xbrowser.storage.get(null).then((state) => {
    state = state || {};

    if (!state.whitelist) {
      state.whitelist = {};
    }
    store.dispatch('LOAD_WHITELIST', state.whitelist);

    if (!state.results) {
      state.results = {};
    }
    store.commit('LOAD_DEEPSCAN_RESULTS', state.results);

    BC.util.onDOMReady(() => {
      botcheckScanner.injectButtons();
      botcheckScanner.injectDialogs();
    });
  });

  // Listen for whitelist changes and send updates to Vuex store
  BC.xbrowser.storage.onChanged((changes) => {
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
      // chrome.storage.local.get('results', ({ results }) => {
      BC.xbrowser.storage.get('results').then((results) => {
        console.log('(botcheck) Detected page focus. Loading deepscan results.');
        store.commit('LOAD_DEEPSCAN_RESULTS', results);
      });
    }
  });
}

// On fresh page load, if the URL has the apikey lets get it.
if (window.location.href.indexOf('https://twitter.com/?apikey=') === 0) {
  let params = BC.util.parseQueryString(window.location.search);

  // Store the API key
  // The content scripts should be monitoring the storage and notice the change
  BC.xbrowser.storage.set({apiKey: params.apikey});
  console.log('(botcheck) Stored api key', params.apikey);

  begin(params.apikey);
}
else {
  // Try to load API key from browser storage
  BC.xbrowser.storage.get(null).then((state) => {
    console.log('(botcheck) Starting... Got state:', state);

    if (!state.apiKey) {
      // No API key found, ask user to login
      // and do nothing until API key is received
      // setTimeout because Twitter redirects to itself for some reason,
      // and we don't want to open two auth tabs.
      setTimeout(() => {
        store.dispatch('AUTH_TWITTER');
      }, 1000);
    } else {
      begin(state.apiKey);
    }
  });
}

// Listen for API key from the tab used for authentication
// Caveat: storage change events only fire when the change happened on another tab.
BC.xbrowser.storage.onChanged((changes) => {
  if (changes.apiKey && changes.apiKey.newValue) {
    console.log('(botcheck) Detected new API key in storage');
    begin(changes.apiKey.newValue);
  }
});
