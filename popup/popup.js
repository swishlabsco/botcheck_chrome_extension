// Popups can access the store object from the background script,
// so no need to do syncing here.
const bg = chrome.extension.getBackgroundPage();
const store = bg.store;

const app = new Vue({
  el: '#app',
  data() {
    return {
      showMainView: true,
      showWhitelistView: false,
      whitelist: {}
    };
  },
  methods: {
    openWhitelist() {
      // Load whitelist when opening
      chrome.storage.sync.get(['whitelist'], (whitelist) => {
        console.log('loading whitelist:');
        console.log(whitelist);
        this.whitelist = whitelist;
        this.showMainView = false;
        this.showWhitelistView = true;
      });
    },
    closeWhitelist() {
      this.showWhitelistView = false;
      this.showMainView = true;
    },
    remove(username) {
      // Update storage, content scripts should listen for changes
      chrome.storage.sync.get(['whitelist'], (whitelist) => {
        if (whitelist[username]) {
          delete whitelist[username];
          chrome.storage.sync.set(['whitelist'], whitelist);
          this.whitelist = whitelist;
        }
      });
    }
  }
});
