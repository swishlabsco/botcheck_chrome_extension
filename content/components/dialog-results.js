Vue.component('dialog-results', {
  template: `
    <el-dialog :visible.sync="dialogVisible" :class="{ 'botcheck-dialog': true }" :show-close="false">
      <el-container>
        <el-main>
          <el-row type="flex">
            <el-col :span="5">
              <img :src="icon" class="botcheck-modal-image">
            </el-col>
            <el-col :span="19">
              <span class="header" v-if="results.prediction === true">Propaganda Bot-like Patterns Detected!</span>
              <span class="status-text" v-if="results.prediction === true">
                Our model has classified
                <strong>@{{ results.username }}</strong> to exhibit patterns conducive to a political bot or highly moderated account. This account is likely a bot.
              </span>
              <span class="header" v-if="results.prediction === false">Propaganda Bot-like Patterns Not Detected!</span>
              <span class="status-text" v-if="results.prediction === false">
                Our model finds that
                <strong>@{{ results.username }}</strong> does not exhibit patterns conducive to propaganda bots or moderated behavior conducive
                to political propaganda accounts.
              </span>
            </el-col>
          </el-row>
          <div @click="share" :class="{ 'share-link': true, 'positive': results.prediction === false }">
            <i class="Icon Icon--bird"></i><span>Share Result</span>
          </div>
          <el-dropdown trigger="click" @command="actionCommand">
            <span class="el-dropdown-link">
              <i class="el-icon-arrow-down el-icon--right"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="disagree">Disagree</el-dropdown-item>
              <el-dropdown-item command="whitelist">Whitelist</el-dropdown-item>
              <el-dropdown-item divided command="report">Report to Twitter</el-dropdown-item>
              <el-dropdown-item divided command="learn-more">Learn More</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </el-main>
      </el-container>
    </el-dialog>
  `,
  computed: {
    icon() {
      const results = this.$store.state.results;
      if (
        results
        && results[this.username]
        && results[this.username].prediction === true
      ) {
        return chrome.extension.getURL('icons/mad@128.png');
      }
      return chrome.extension.getURL('icons/happy@128.png');
    },
    username() {
      return this.$store.state.dialogs.results.username;
    },
    realName() {
      return this.$store.state.dialogs.results.realName;
    },
    results() {
      const results = this.$store.state.results;
      if (results && results[this.username]) {
        return results[this.username];
      }
      return {};
    },
    dialogVisible: {
      get() {
        return this.$store.state.dialogs.results.visible;
      },
      set() {
        this.$store.commit('RESULTS_CLOSE');
      }
    }
  },
  methods: {
    actionCommand(type) {
      if (type === 'disagree') {
        this.$store.commit('RESULTS_CLOSE');
        this.$store.dispatch('DISAGREE', this.results.prediction);
        this.$store.commit('THANKS_OPEN');
      } else if (type === 'whitelist') {
        const username = this.results.username;
        const realName = this.results.realname;
        this.whitelist(username, realName);
      } else if (type === 'report') {
        this.$store.commit('REPORT_TWEET');
      } else {
        this.$store.commit('LEARN_MORE');
      }
    },
    share() {
      this.$store.commit('SHARE', { prediction: this.results.prediction, username: this.username });
      this.$store.commit('RESULTS_CLOSE');
    },
    // Updates whitelist on browser storage.
    // Content scripts should pick up on the change
    whitelist(username, realName) {
      chrome.storage.sync.get('whitelist', ({ whitelist }) => {
        if (chrome.runtime.lastError) {
          console.error('(botcheck) Failed to update whitelist.');
          console.error(chrome.runtime.lastError);
          return;
        }
        if (!whitelist) {
          whitelist = {};
        }
        if (!whitelist[username]) {
          whitelist[username] = {
            realName
          };
        }
        chrome.storage.sync.set({ whitelist }, () => {
          if (chrome.runtime.lastError) {
            console.error('(botcheck) Failed to update whitelist.');
            console.error(chrome.runtime.lastError);
            return;
          }
          this.$store.commit('RESULTS_CLOSE');
        });
      });
    }
  }
});
