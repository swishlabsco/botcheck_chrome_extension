// Popups can access the store object from the background script,
// so no need to do syncing here.
let bg = chrome.extension.getBackgroundPage();
let store = bg.store;

let app = new Vue({
  el: '#app',
  data() {
    return {
      apiKey: store.state.apiKey
    };
  },
  methods: {
    openWhitelist() {
      chrome.runtime.sendMessage({
        name: 'STATE_MUTATION',
        details: {
          name: 'WHITELIST_OPEN',
          args: ''
        }
      });
    }
  }
});
