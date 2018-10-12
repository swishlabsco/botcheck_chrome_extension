Vue.component('botcheck-status', {
  template: `
    <div :class="containerClass" @click="openModal">
      <span class="icon"><img :src="icon"/></span>
      <span :class="messageClass">{{message}}</span>
    </div>
  `,
  props: ['realName', 'screenName', 'isFeed', 'isRetweet', 'isProfile'],
  computed: {
    icon() {
      let result = this.$store.state.results[this.screenName];
      if (result && result.prediction) {
        return chrome.extension.getURL('icons/mad.svg');
      }
      if (result && !result.prediction) {
        return chrome.extension.getURL('icons/happy_outline.svg');
      }

      return chrome.extension.getURL('icons/scanning.svg');
    },
    containerClass() {
      let className = 'botcheck';
      let result = this.$store.state.results[this.screenName];
      if (!this.isFeed && !this.isProfile && result && result.prediction === true) {
        className += ' button';
      }
      if (!this.isFeed && !this.isProfile && result && result.prediction === false) {
        className += ' retweet';
      }
      if (this.isRetweet && result.prediction === true) {
        className += ' pull-up';
      }
      if (this.isProfile) {
        className += ' inline';
      }
      return className;
    },
    messageClass() {
      let result = this.$store.state.results[this.screenName];
      if (result && result.prediction === true) {
        return 'status-text bot';
      }
      if (result && result.prediction === false) {
        return 'status-text';
      }

      return 'status-text';
    },
    message() {
      let result = this.$store.state.results[this.screenName];
      if (result && result.prediction) {
        return 'Likely a Bot';
      }
      if (result && !result.prediction) {
        return 'Not a Bot';
      }

      return 'Scanning...';
    }
  },
  methods: {
    openModal(e) {
      e.preventDefault();
      e.stopPropagation();

      let result = this.$store.state.results[this.screenName];
      store.broadcastMutation('RESULTS_OPEN', this.screenName);
    }
  }
});
