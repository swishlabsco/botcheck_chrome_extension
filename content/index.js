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
  botcheckScanner.injectButtons();
  botcheckScanner.injectDialogs();
}

// Load api key and whitelist from chrome storage
chrome.storage.sync.get(null, (state) => {
  console.log('(botcheck) Starting... Got state:');
  console.log(state);
  if (!state.apiKey) {
    // No API key found, ask user to login
    // and do nothing until API key is received
    store.dispatch('AUTH_TWITTER');
    return;
  }
  if (state.whitelist) {
    store.commit('WHITELIST_SET', { type: 'load', whitelist: state.whitelist });
  }
  begin(state.apiKey);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.apiKey && changes.apiKey.newValue) {
    console.log('(botcheck) Detected new API key in storage');
    begin(changes.apiKey.newValue);
  }
  if (changes.whitelist && changes.whitelist.newValue) {
    store.commit('WHITELIST_SET', { type: 'load', whitelist: changes.whitelist.newValue });
    console.log('(botcheck) Detected whitelist change in storage');
    console.log(changes);
  }
});
