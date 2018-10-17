Vue.component('botcheck-status', {
  template: `
    <div :class="containerClass" @click="openModal">
      <span class="icon"><img :src="icon"/></span>
      <span :class="messageClass">{{message}}</span>
    </div>
  `,
  props: ['realName', 'username', 'isFeed', 'isRetweet', 'isProfile'],
  computed: {
    prediction() {
      // Null means result is unknown
      // Undefined means we haven't scanned yet
      const results = this.$store.state.results;
      if (!results) {
        return undefined;
      }
      const result = results[this.username];
      if (result) {
        return result.prediction;
      }
      return undefined;
    },
    whitelisted() {
      const whitelist = this.$store.state.whitelist;
      if (!whitelist) {
        return false;
      }
      return !!whitelist[this.username]; // cast to boolean
    },
    icon() {
      if (this.whitelisted || this.prediction === false) {
        return chrome.extension.getURL('icons/happy_outline.svg');
      }
      if (this.prediction === true) {
        return chrome.extension.getURL('icons/mad.svg');
      }
      return chrome.extension.getURL('icons/scanning.svg');
    },
    containerClass() {
      let className = 'botcheck';
      if (
        !this.whitelisted
        && !this.isFeed
        && !this.isProfile
        && this.prediction === true
      ) {
        className += ' button';
      }
      if (!this.isFeed && !this.isProfile && this.prediction === false) {
        className += ' retweet';
      }
      if (
        !this.whitelisted
        && this.isRetweet
        && this.prediction === true
      ) {
        className += ' pull-up';
      }
      if (this.isProfile) {
        className += ' inline';
      }
      return className;
    },
    messageClass() {
      if (this.prediction === false || this.whitelisted) {
        return 'status-text';
      }
      if (this.prediction === true) {
        return 'status-text bot';
      }
      return 'status-text';
    },
    message() {
      if (this.whitelisted) {
        return 'Whitelisted';
      }
      if (this.prediction === true) {
        return 'Likely a Bot';
      }
      if (this.prediction === false) {
        return 'Not a Bot';
      }
      if (this.prediction === null) {
        // Happens for private profiles,
        // or when server returns error
        return 'Unknown';
      }
      return 'Scanning...';
    }
  },
  methods: {
    openModal(e) {
      e.preventDefault();
      e.stopPropagation();

      store.commit('RESULTS_OPEN', {
        username: this.username,
        realName: this.realName,
        whitelisted: this.whitelisted
      });
    }
  }
});
