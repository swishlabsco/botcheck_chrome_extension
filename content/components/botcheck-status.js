Vue.component('botcheck-status', {
  template: `
    <div :class="containerClass" @click="onClick">
      <span class="icon"><img :src="icon"/></span>
      <span :class="messageClass">{{message}}</span>
    </div>
  `,
  props: ['realName', 'username', 'isFeed', 'isRetweet', 'isProfile'],
  computed: {
    result() {
      const results = this.$store.state.results;
      if (results && results[this.username]) {
        return results[this.username];
      }
    },
    prediction() {
      if (this.result) {
        return this.result.prediction;
      }
    },
    whitelisted() {
      const whitelist = this.$store.state.whitelist;
      if (!whitelist) {
        return false;
      }
      return !!whitelist[this.username]; // cast to boolean
    },
    isClickToScan() {
      // Status should be "Run Bot Scan" when a light scan
      // has been run with a result of false
      return (this.prediction === false && !this.result.deepScan);
    },
    icon() {
      if (this.whitelisted || this.prediction === false) {
        return BC.xbrowser.extension.getURL('icons/happy_outline.svg');
      }
      if (this.prediction === true) {
        return BC.xbrowser.extension.getURL('icons/mad.svg');
      }
      return BC.xbrowser.extension.getURL('icons/scanning.svg');
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
      if (this.isClickToScan) {
        return 'Run Bot Scan';
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
    onClick(e) {
      e.preventDefault();
      e.stopPropagation();

      if (this.isClickToScan) {
        Vue.delete(this.$store.state.results, this.username);

        this.$store.dispatch('SCAN', {
          username: this.username,
          realName: this.realName,
          ignoreWhitelist: false,
          deepScan: true
        });
      } else if (this.result) {
        // Open modal if not "Scanning..."
        this.$store.commit('RESULTS_OPEN', {
          username: this.username,
          realName: this.realName,
          whitelisted: this.whitelisted,
          clickEvent: e
        });
      }
    }
  }
});
