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
      let results = this.$store.state.results;
      let dialogScreenName = this.$store.state.dialogs.results.screenName;
      let result = results[dialogScreenName];

      if (result && result.prediction === true) {
        return chrome.extension.getURL('icons/mad@128.png');
      }

      return chrome.extension.getURL('icons/happy@128.png');
    },
    screenName() {
      return this.$store.state.dialogs.results.screenName;
    },
    results() {
      let results = this.$store.state.results;
      let dialogScreenName = this.$store.state.dialogs.results.screenName;
      if (results && results[dialogScreenName]) {
        return results[dialogScreenName];
      }
      return {};
    },
    dialogVisible: {
      get() {
        return this.$store.state.dialogs.results.visible;
      },
      set() {
        this.$store.broadcastMutation('RESULTS_CLOSE');
      }
    }
  },
  methods: {
    actionCommand(type) {
      if (type === 'disagree') {
        this.$store.broadcastMutation('RESULTS_CLOSE');
        this.$store.broadcastAction('DISAGREE', this.results.prediction);
        this.$store.broadcastMutation('THANKS_OPEN');
      } else if (type === 'whitelist') {
        let results = this.$store.state.results;
        let dialogScreenName = this.$store.state.dialogs.results.screenName;

        this.$store.broadcastMutation('RESULTS_CLOSE');
        this.$store.broadcastAction('ADD_TO_WHITELIST', results[dialogScreenName]);
      } else if (type === 'report') {
        this.$store.broadcastMutation('REPORT_TWEET');
      } else {
        this.$store.broadcastMutation('LEARN_MORE');
      }
    },
    share() {
      this.$store.broadcastMutation('RESULTS_CLOSE');
      this.$store.broadcastMutation('SHARE', { prediction: this.results.prediction, screenName: this.screenName });
    }
  }
});
