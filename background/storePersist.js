// Save api key to chrome storage when API key changes
store.subscribe((mutation, state) => {
  if (mutation.type === 'AUTH_APIKEY_SET' && mutation.payload) {
    chrome.storage.sync.set({ apiKey: mutation.payload });
  }
  else if (mutation.type === 'WHITELIST_SET' && state.synced) {
  	chrome.storage.sync.set({ whitelist: state.synced.whitelist });
  }
});

// Load api key and whitelist from chrome storage on startup
chrome.storage.sync.get(null, state => {
  if (state.apiKey) {
    store.commit('AUTH_APIKEY_SET', state.apiKey);
  }
  if (state && state.synced && state.synced.whitelist) {
  	store.commit('WHITELIST_SET', state.synced.whitelist);
  }
});
