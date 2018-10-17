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
                <strong>@{{ result.username }}</strong> has been whitelisted, which means their scan results are being ignored.
              </span>
              <br>
              <div
                @click="removeFromWhitelist(result.username)"
                class="remove-from-whitelist"
              ><span>Un-Whitelist</span>
              </div>
            </el-col>
          </el-row>
        </el-main>
        <el-main v-else>
          <el-row type="flex">
            <el-col :span="5">
              <img :src="icon" class="botcheck-modal-image">
            </el-col>
            <el-col :span="19">
              <span class="header" v-if="prediction === true">Propaganda Bot-like Patterns Detected!</span>
              <span class="status-text" v-if="prediction === true">
                Our model has classified
                <strong>@{{ result.username }}</strong> to exhibit patterns conducive to a political bot or highly moderated account. This account is likely a bot.
              </span>
              <span class="header" v-if="prediction === false">Propaganda Bot-like Patterns Not Detected!</span>
              <span class="status-text" v-if="prediction === false">
                Our model finds that
                <strong>@{{ result.username }}</strong> does not exhibit patterns conducive to propaganda bots or moderated behavior conducive
                to political propaganda accounts.
              </span>
              <div
                v-if="prediction === false || prediction === true"
                @click="share"
                :class="{ 'share-link': true, 'positive': prediction === false }"
              >
                <i class="Icon Icon--bird"></i><span>Share Result</span>
              </div>
              <span class="header" v-if="prediction === null || prediction === undefined">
                Unknown result
              </span>
              <span class="status-text" v-if="prediction === null || prediction === undefined">
                We couldn't tell whether
                <strong>@{{ result.username }}</strong> is likely to be a bot.
                <br>
                This may happen when an account is set to private, or if something went wrong on our end.
              </span>
            </el-col>
          </el-row>
          <el-dropdown trigger="click" @command="actionCommand">
            <span class="el-dropdown-link">
              <i class="el-icon-arrow-down el-icon--right"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item
                command="disagree"
                v-if="prediction === true || prediction === false"
              >
                Disagree
              </el-dropdown-item>
              <el-dropdown-item
                command="whitelist"
                v-if="prediction === true || prediction === false"
              >
                Whitelist
              </el-dropdown-item>
              <el-dropdown-item
                divided
                command="report"
                v-if="prediction === true || prediction === false"
              >
                Report to Twitter
              </el-dropdown-item>
              <el-dropdown-item
                v-bind:divided="prediction === true || prediction === false"
                command="learn-more"
              >
                Learn More
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </el-main>
      </el-container>
    </el-dialog>
  `,
  computed: {
    username() {
      return this.$store.state.dialogs.results.username;
    },
    realName() {
      return this.result.realName;
    },
    whitelisted() {
      return this.$store.state.dialogs.results.whitelisted;
    },
    result() {
      const results = this.$store.state.results;
      if (results && results[this.username]) {
        return results[this.username];
      }
      return {};
    },
    prediction() {
      return this.result.prediction;
    },
    icon() {
      if (this.whitelisted) {
        return chrome.extension.getURL('icons/Happy@128-gray.png');
      }
      if (this.prediction === true) {
        return chrome.extension.getURL('icons/Mad@128.png');
      }
      if (this.prediction === false) {
        return chrome.extension.getURL('icons/Happy@128.png');
      }
      return chrome.extension.getURL('icons/scanning@128.png');
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
        this.$store.dispatch('DISAGREE', this.prediction);
        this.$store.commit('THANKS_OPEN');
      } else if (type === 'whitelist') {
        const username = this.result.username;
        const realName = this.result.realName;
        this.addToWhitelist(username, realName);
      } else if (type === 'report') {
        this.$store.commit('REPORT_TWEET');
      } else {
        this.$store.commit('LEARN_MORE');
      }
    },
    share() {
      this.$store.commit('SHARE', { prediction: this.prediction, username: this.username });
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
