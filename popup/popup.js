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
      users: [
        {
          realname: 'Marcos',
          username: 'voxelbased'
        }
      ]
    };
  },
  methods: {
    openWhitelist() {
      this.showMainView = false;
      this.showWhitelistView = true;
    },
    closeWhitelist() {
      this.showWhitelistView = false;
      this.showMainView = true;
    }
  }
});
