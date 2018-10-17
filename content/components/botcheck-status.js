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
      const results = this.$store.state.results;
      if (results) {
        const result = results[this.username];
        if (result) {
          return result.prediction;
        }
      }
    },
    icon() {
      if (this.prediction) {
        return chrome.extension.getURL('icons/mad.svg');
      }
      if (!this.prediction) {
        return chrome.extension.getURL('icons/happy_outline.svg');
      }
      return chrome.extension.getURL('icons/scanning.svg');
    },
    containerClass() {
      let className = 'botcheck';
      if (!this.isFeed && !this.isProfile && this.prediction === true) {
        className += ' button';
      }
      if (!this.isFeed && !this.isProfile && this.prediction === false) {
        className += ' retweet';
      }
      if (this.isRetweet && this.prediction === true) {
        className += ' pull-up';
      }
      if (this.isProfile) {
        className += ' inline';
      }
      return className;
    },
    messageClass() {
      if (this.prediction === true) {
        return 'status-text bot';
      }
      if (this.prediction === false) {
        return 'status-text';
      }

      return 'status-text';
    },
    message() {
      if (this.prediction) {
        return 'Likely a Bot';
      }
      if (!this.prediction) {
        return 'Not a Bot';
      }
      return 'Scanning...';
    }
  },
  methods: {
    openModal(e) {
      e.preventDefault();
      e.stopPropagation();

      store.commit('RESULTS_OPEN', { username: this.username, realName: this.realName });
    }
  }
});
