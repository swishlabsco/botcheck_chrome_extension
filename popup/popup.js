// Popups can access the store object from the background script,
// so no need to do syncing here.
const bg = chrome.extension.getBackgroundPage();
const store = bg.store;

const app = new Vue({
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
