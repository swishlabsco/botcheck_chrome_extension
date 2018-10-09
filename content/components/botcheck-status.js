Vue.component('botcheck-status', {
  template: html`
    <div :class="containerClass" @click="openModal()">
      <span class="icon"><img :src="icon"/></span>
      <span :class="messageClass">{{message}}</span>
    </div>
  `(),
  props: ['realName', 'screenName', 'isFeed', 'isRetweet', 'isProfile'],
  computed: {
    icon() {
      let result = this.$store.state.synced.results[this.screenName];
      if (result && result.prediction) {
        return chrome.extension.getURL('icons/mad@18.png');
      }
      else if (result && !result.prediction) {
        return chrome.extension.getURL('icons/happy_outline@48.png');
      }

      return chrome.extension.getURL('icons/scanning@48.png');
    },
    containerClass() {
      let className = 'botcheck';
      let result = this.$store.state.synced.results[this.screenName];
      if (!this.isFeed && !this.isProfile && result && result.prediction) {
        className += ' button';
      }
      if (this.isRetweet) {
        className += ' pull-up';
      }
      if (this.isProfile) {
        className += ' inline';
      }
      return className;
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
  },
  methods: {
    openModal() {
      let result = this.$store.state.synced.results[this.screenName];
      if (!this.isFeed && !this.isProfile && result && result.prediction) {
        store.broadcastMutation('RESULTS_OPEN', this.screenName);
      }
    }
  }
});
