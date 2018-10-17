Vue.component('dialog-results', {
  template: `
    <el-dialog :visible.sync="dialogVisible" :class="{ 'botcheck-dialog': true }" :show-close="false">
      <el-container>
        <el-main v-if="whitelisted">
          <el-row type="flex">
            <el-col :span="5">
              <img :src="icon" class="botcheck-modal-image">
            </el-col>
            <el-col :span="19">
              <span class="header">This user has been whitelisted</span>
              <span class="status-text">
                <strong>@{{ results.username }}</strong> has been whitelisted, which means their scan results are being ignored.
              </span>
              <br>
              <el-button class="remove-from-whitelist" @click="removeFromWhitelist(results.username)">Remove @{{ results.username }} from whitelist</el-button>
            </el-col>
          </el-row>
        </el-main>
        <el-main v-else>
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
              <div @click="share" :class="{ 'share-link': true, 'positive': results.prediction === false }">
                <i class="Icon Icon--bird"></i><span>Share Result</span>
              </div>
            </el-col>
          </el-row>
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
    results() {
      const results = this.$store.state.results;
      if (results && results[this.username]) {
        return results[this.username];
      }
      return {};
    },
    icon() {
      if (this.whitelisted) {
        return chrome.extension.getURL('icons/Happy@128-gray.png');
      }
      if (this.results.prediction === true) {
        return chrome.extension.getURL('icons/Mad@128.png');
      }
      return chrome.extension.getURL('icons/Happy@128.png');
    },
    username() {
      return this.$store.state.dialogs.results.username;
    },
    realName() {
      return this.$store.state.dialogs.results.realName;
    },
    whitelisted() {
      return this.$store.state.dialogs.results.whitelisted;
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
        const realName = this.results.realName;
        this.addToWhitelist(username, realName);
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
    addToWhitelist(username, realName) {
      if (!username || !realName) {
        console.error(`
          (botcheck) Attempted to whitelist user but missing username or real name.
          username: ${username}
          realName: ${realName}
        `);
      }
      this.getWhitelist((whitelist) => {
        if (!whitelist[username]) {
          whitelist[username] = {
            realName
          };
        }
        this.setWhitelist(whitelist);
        this.$store.commit('RESULTS_CLOSE');
      });
    },
    // Updates whitelist on browser storage.
    // Content scripts should pick up on the change
    removeFromWhitelist(username) {
      this.getWhitelist((whitelist) => {
        if (whitelist[username]) {
          delete whitelist[username];
          this.setWhitelist(whitelist);
        } else {
          console.warn(`
            (botcheck) Attempted to remove user from whitelist by clicking
            button in results dialog, but user was not in whitelist.
          `);
        }
        this.$store.commit('RESULTS_CLOSE');
      });
    },
    getWhitelist(callback) {
      chrome.storage.sync.get('whitelist', ({ whitelist }) => {
        if (chrome.runtime.lastError) {
          console.error('(botcheck) Failed to update whitelist.');
          console.error(chrome.runtime.lastError);
          return;
        }
        if (!whitelist) {
          whitelist = {};
        }
        callback(whitelist);
      });
    },
    setWhitelist(whitelist, callback) {
      chrome.storage.sync.set({ whitelist }, () => {
        if (chrome.runtime.lastError) {
          console.error('(botcheck) Failed to update whitelist.');
          console.error(chrome.runtime.lastError);
          return;
        }
        if (callback) {
          callback();
        }
      });
    }
  }
});
