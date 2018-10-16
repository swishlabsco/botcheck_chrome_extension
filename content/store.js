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
        screenName: ''
      },
      thanks: {
        visible: false
      },
      auth: {
        screenName: '',
        visible: false
      }
    },
    message: 'Scanning...',
    results: {
      exampleUserName: {
        realname: 'exampleRealName',
        username: 'exampleUserName',
        prediction: false,
        profile_image: ''
      }
    },
    whitelist: {
      exampleUserName: {
        realName: 'exampleRealName'
      }
    }
  },
  mutations: {
    AUTH_APIKEY_SET(state, apiKey) {
      console.log('(botcheck) mutation: AUTH_APIKEY_SET');
      state.apiKey = apiKey;
    },
    WHITELIST_SET(state, payload) {
      console.log('(botcheck) mutation: WHITELIST_SET');
      if (payload.type === 'add') {
        console.log(payload);
        chrome.storage.sync.get(['whitelist'], (whitelist) => {
          if (!whitelist[payload.user.username]) {
            whitelist[payload.user.username] = payload.user.realname;
            chrome.storage.sync.set({ whitelist });
            console.log('setting whitelist to:');
            console.log(whitelist);
            state.whitelist = whitelist;
          }
        });
      } else if (payload.type === 'load') {
        state.whitelist = payload.whitelist;
      }
    },
    SCREEN_NAME_CHECK_DONE(state, result) {
      console.log(`(botcheck) mutation: SCREEN_NAME_CHECK_DONE. Username: ${result.username} Prediction: ${result.prediction}`);
      Vue.set(state.results, result.username, result);
      state.dialogs.results.loading = false;
    },
    RESULTS_OPEN(state, screenName) {
      console.log('(botcheck) mutation: RESULTS_OPEN');
      state.dialogs.results.visible = true;
      state.dialogs.results.screenName = screenName;
    },
    RESULTS_CLOSE(state) {
      console.log('(botcheck) mutation: RESULTS_CLOSE');
      state.dialogs.results.visible = false;
      state.dialogs.results.screenName = '';
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
    SHARE(context, args) {
      console.log('(botcheck) mutation: SHARE');
      const msg = args.prediction === true ? 'likely' : 'not+likely';
      window.open(`https://twitter.com/intent/tweet/?text=I+just+found+out+@${args.screenName}+is+${msg}+a+propaganda+account%2C+by+using+the+botcheck+browser+extension%21+You+can+download+it+from+https%3A%2F%2Fbotcheck.me+and+check+for+yourself.`);
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
      console.log('(botcheck) action: DEEP_SCAN');

      if (!args.realName || !args.screenName) {
        console.error('(botcheck) Called deep scan without real name or screen name.');
        return;
      }
      if (!context.state.apiKey) {
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't do whitelisted accounts, return not a bot
      if (context.state.whitelist[args.screenName]) {
        console.log(`${args.screenName} is whitelisted, returning prediction: false`);
        context.commit('SCREEN_NAME_CHECK_DONE', { realname: args.realName, username: args.screenName, prediction: false });
        return;
      }

      // Don't check network again if we've already done the check
      // This will reset on browser restart
      if (context.state.results[args.screenName]) {
        console.log(`${args.screenName} has already been deep scanned, returning previous result`);
        context.commit('SCREEN_NAME_CHECK_DONE', context.state.results[args.screenName]);
        return;
      }

      axios
        .post(`${botcheckConfig.apiRoot}/DeepScan`, {
          username: args.screenName,
          apikey: context.state.apiKey
        })
        .then((result) => {
          if (result && result.data) {
            console.log(`${args.screenName} has been deep scanned. Prediction: ${result.data.prediction}`);
            console.log(result);
            console.log(args.screenName);

            result.data.realname = args.realName;
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

      if (!args.realName || !args.screenName) {
        console.error(`
          (botcheck) Called light scan without real name or screen name.
          Real name: ${args.realName} Screen name: ${args.screenName}
        `);
        return;
      }
      if (!context.state.apiKey) {
        console.log('(botcheck) Called light scan but store has no API key. Triggering authentication...');
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't do whitelisted accounts, return not a bot
      if (context.state.whitelist[args.screenName]) {
        console.log(`
          (botcheck) Called light scan but ${args.screenName} is whitelisted.
          Returning prediction: false
        `);
        context.commit('SCREEN_NAME_CHECK_DONE', { realname: args.realName, username: args.screenName, prediction: false });
        return;
      }

      // Don't check network again if we've already done the check
      if (context.state.results[args.screenName]) {
        console.log(`
          (botcheck) Called light scan but ${args.screenName} has already been scanned.
          Returning prediction: ${context.state.results[args.screenName].prediction}
        `);
        context.commit('SCREEN_NAME_CHECK_DONE', context.state.results[args.screenName]);
        return;
      }

      axios
        .post(`${botcheckConfig.apiRoot}/LightScan`, {
          username: args.screenName,
          apikey: context.state.apiKey
        })
        .then((result) => {
          if (result && result.data) {
            console.log(`
              (botcheck) Received light scan result for ${args.screenName}.
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
    ADD_TO_WHITELIST(context, args) {
      console.log(`(botcheck) action: ADD_TO_WHITELIST. Username: ${args.screenName}`);

      // add user to whitelist and save (if it's not already in the list)
      // TODO: modify this code to save to storage
      const existing = context.state.whitelist[args.screenName];
      if (!existing) {
        context.commit('WHITELIST_SET', { type: 'add', user: args });
      }
    },
    DISAGREE(context, prediction) {
      console.log(`
        (botcheck) action: DISAGREE.
        Username: ${context.state.dialogs.results.screenName}
        Prediction: ${prediction}
      `);
      axios
        .post(`${botcheckConfig.apiRoot}/disagree`, {
          prediction,
          username: context.state.dialogs.results.screenName,
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
