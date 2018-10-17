/**
 * /popup/popup.js
 *
 * Controls the popup that appears when the extension icon is clicked.
 */

const app = new Vue({ // eslint-disable-line no-unused-vars
  el: '#app',
  data() {
    return {
      showMainView: true,
      showWhitelistView: false,
      whitelist: {
        exampleUsername: {
          realName: 'exampleRealName'
        }
      }
    };
  },
  methods: {
    openWhitelist() {
      // Load whitelist when opening
      chrome.storage.sync.get('whitelist', ({ whitelist }) => {
        if (chrome.runtime.lastError) {
          console.error('(botcheck) Failed to get whitelist.');
          console.error(chrome.runtime.lastError);
        }
        console.log('(botcheck) Popup loaded whitelist:');
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
      chrome.storage.sync.get('whitelist', ({ whitelist }) => {
        if (chrome.runtime.lastError) {
          console.error('(botcheck) Failed to get whitelist.');
          console.error(chrome.runtime.lastError);
          return;
        }
        if (whitelist[username]) {
          delete whitelist[username];

          // Update UI
          this.whitelist = whitelist;

          chrome.storage.sync.set({ whitelist }, () => {
            if (chrome.runtime.lastError) {
              console.error('(botcheck) Failed to set whitelist.');
              console.error(chrome.runtime.lastError);
            }
          });
        }
      });
    },
    openTwitterProfile(username) {
      window.open(`https://twitter.com/${username}`);
    }
  }
});
