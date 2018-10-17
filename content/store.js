/**
 * /content/store.js
 *
 * A Vuex store that keeps track of state in the current tab.
 */

Vue.use(Vuex);

const store = new Vuex.Store({ // eslint-disable-line no-unused-vars
  state: {
    dialogs: {
      results: {
        visible: false,
        loading: false,
        username: '',
        realName: ''
      },
      thanks: {
        visible: false
      }
    },
    message: 'Scanning...',
    results: {
      exampleUsername: {
        realName: 'exampleRealName',
        username: 'exampleUsername',
        prediction: false,
        profile_image: ''
      }
    },
    whitelist: {
      exampleUsername: {
        realName: 'exampleRealName'
      }
    }
  },
  mutations: {
    AUTH_APIKEY_SET(state, apiKey) {
      console.log('(botcheck) mutation: AUTH_APIKEY_SET');
      state.apiKey = apiKey;
    },
    LOAD_WHITELIST(state, whitelist) {
      console.log('(botcheck) mutation: LOAD_WHITELIST. Whitelist:');
      console.log(whitelist);
      state.whitelist = whitelist;
    },
    SCREEN_NAME_CHECK_DONE(state, result) {
      console.log(`
        (botcheck) mutation: SCREEN_NAME_CHECK_DONE.
        Username: ${result.username}
        Prediction: ${result.prediction}
      `);
      Vue.set(state.results, result.username, result);
      state.dialogs.results.loading = false;
    },
    RESULTS_OPEN(state, { username, realName }) {
      console.log('(botcheck) mutation: RESULTS_OPEN');
      state.dialogs.results.visible = true;
      state.dialogs.results.username = username;
      state.dialogs.results.realName = realName;
    },
    RESULTS_CLOSE(state) {
      console.log('(botcheck) mutation: RESULTS_CLOSE');
      state.dialogs.results.visible = false;
      state.dialogs.results.username = '';
      state.dialogs.results.realName = '';
    },
    THANKS_OPEN(state) {
      console.log('(botcheck) mutation: THANKS_OPEN');
      state.dialogs.thanks.visible = true;
    },
    THANKS_CLOSE(state) {
      console.log('(botcheck) mutation: THANKS_CLOSE');
      state.dialogs.thanks.visible = false;
    },
    LEARN_MORE() {
      console.log('(botcheck) mutation: LEARN_MORE');
      window.open('https://botcheck.me');
    },
    REPORT_TWEET() {
      console.log('(botcheck) mutation: REPORT_TWEET');
      window.open('https://help.twitter.com/en/rules-and-policies/twitter-report-violation');
    },
    SHARE(context, { username, prediction }) {
      console.log('(botcheck) mutation: SHARE');
      const msg = prediction === true ? 'likely' : 'not+likely';
      window.open(`https://twitter.com/intent/tweet/?text=I+just+found+out+@${username}+is+${msg}+a+propaganda+account%2C+by+using+the+botcheck+browser+extension%21+You+can+download+it+from+https%3A%2F%2Fbotcheck.me+and+check+for+yourself.`);
    }
  },
  actions: {
    AUTH_TWITTER() {
      console.log('(botcheck) action: AUTH_TWITTER');
      const browserToken = botcheckUtils.generateBrowserToken();
      window.open(`${botcheckConfig.apiRoot}/ExtensionLogin?token=${browserToken}`);
      // Now the background script auth-listener.js should see the login and trigger a response.
    },
    DEEP_SCAN(context, args) {
      console.log(`(botcheck) action: DEEP_SCAN. Username: ${args.username}`);

      if (!args.realName || !args.username) {
        console.error('(botcheck) Called deep scan without real name or screen name.');
        return;
      }
      if (!context.state.apiKey) {
        console.error('(botcheck) Called deep scan but no API key found. Triggering auth...');
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't do whitelisted accounts, return not a bot
      if (context.state.whitelist[args.username]) {
        console.log(`${args.username} is whitelisted, returning prediction: false`);
        context.commit('SCREEN_NAME_CHECK_DONE', { realname: args.realName, username: args.username, prediction: false });
        return;
      }

      // Don't check network again if we've already done the check
      if (context.state.results[args.username]) {
        console.log(`${args.username} has already been deep scanned, returning previous result`);
        context.commit('SCREEN_NAME_CHECK_DONE', context.state.results[args.username]);
        return;
      }

      axios
        .post(`${botcheckConfig.apiRoot}/DeepScan`, {
          username: args.username,
          apikey: context.state.apiKey
        })
        .then((result) => {
          if (result && result.data) {
            console.log(`${args.username} has been deep scanned. Prediction: ${result.data.prediction}`);
            console.log(result);
            console.log(args.username);

            context.dispatch('STORE_RESULT', result);
            context.commit('SCREEN_NAME_CHECK_DONE', result.data);
            context.dispatch('LOG', result.data);
          }
        })
        .catch((e) => {
          console.error(e);
          console.error('Unable to run deep scan.');
        });
    },
    LIGHT_SCAN(context, args) {
      console.log('(botcheck) action: LIGHT_SCAN');

      if (!args.realName || !args.username) {
        console.error(`
          (botcheck) Called light scan without real name or screen name.
          Real name: ${args.realName} Screen name: ${args.username}
        `);
        return;
      }
      if (!context.state.apiKey) {
        console.log('(botcheck) Called light scan but store has no API key. Triggering authentication...');
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't do whitelisted accounts, return not a bot
      if (context.state.whitelist[args.username]) {
        console.log(`
          (botcheck) Called light scan but ${args.username} is whitelisted.
          Returning prediction: false
        `);
        context.commit('SCREEN_NAME_CHECK_DONE', { realname: args.realName, username: args.username, prediction: false });
        return;
      }

      // Don't check network again if we've already done the check
      if (context.state.results[args.username]) {
        console.log(`
          (botcheck) Called light scan but ${args.username} has already been scanned.
          Returning prediction: ${context.state.results[args.username].prediction}
        `);
        context.commit('SCREEN_NAME_CHECK_DONE', context.state.results[args.username]);
        return;
      }

      axios
        .post(`${botcheckConfig.apiRoot}/LightScan`, {
          username: args.username,
          apikey: context.state.apiKey
        })
        .then((result) => {
          if (result && result.data) {
            console.log(`
              (botcheck) Received light scan result for ${args.username}.
              Prediction: ${result.data.prediction}
            `);
            result.data.realname = args.realName;
            context.commit('SCREEN_NAME_CHECK_DONE', result.data);
            context.dispatch('LOG', result.data);
          }
        })
        .catch((e) => {
          console.error(e);
          console.error('Unable to run light scan.');
        });
    },
    STORE_RESULT(context, result) {
      console.log('trying to store result:');
      console.log(result);
    },
    DISAGREE(context, prediction) {
      console.log(`
        (botcheck) action: DISAGREE.
        Username: ${context.state.dialogs.results.username}
        Prediction: ${prediction}
      `);
      axios
        .post(`${botcheckConfig.apiRoot}/disagree`, {
          prediction,
          username: context.state.dialogs.results.username,
          apikey: context.state.apiKey
        })
        .catch((e) => {
          console.error(e);
          console.error('Unable to log disagreement.');
        });
    },
    LOG(context, payload) {
      console.log('(botcheck) action: LOG');
      // Log errors/messages/etc to remote logger
      const uuid = botcheckUtils.generateUuid();

      axios
        .post('https://log.declaredintent.com/entries', {
          namespace: 'me.botcheck.chrome-extension',
          useragent: navigator && navigator.userAgent,
          payload,
          uuid
        })
        .catch((e) => {
          console.error(e);
          console.error('Unable to log to declared intent. Attempted to send payload:');
          console.error(payload);
        });
    }
  }
});
