Vue.component('botcheck-status', {
  template: html`
    <div class="ProfileHeaderCard-botcheck">
      <span class="Icon"><img :src="icon"/></span>
      <span :class="messageClass">{{message}}</span>
    </div>
  `(),
  props: ['screenName'],
  computed: {
    icon() {
      let result = this.$store.state.synced.results[this.screenName];
      if (result && result.prediction) {
        return chrome.extension.getURL('icons/mad@18.png');
      }
      else if (result && !result.prediction) {
        return chrome.extension.getURL('icons/default@18-gray.png');
      }

      return chrome.extension.getURL('icons/default@18-gray.png');
    },
    messageClass() {
      let result = this.$store.state.synced.results[this.screenName];
      if (result && result.prediction) {
        return 'status-text bot';
      }
      else if (result && !result.prediction) {
        return 'status-text';
      }
      
      return 'status-text';
    },
    message() {
      let result = this.$store.state.synced.results[this.screenName];
      if (result && result.prediction) {
        return 'Likely a Bot';
      }
      else if (result && !result.prediction) {
        return 'Not a Bot';
      }
      
      return 'Scanning...';
    }
  }
});
