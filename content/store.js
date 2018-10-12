/**
 * /content/store.js
 *
 * A Vuex store that keeps track of state in the current tab.
 */

Vue.use(Vuex);

const store = new Vuex.Store({
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
      whitelist: {
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
        Vue.set(state.whitelist, payload.user.username, payload.user);
      } else if (payload.type === 'delete') {
        Vue.delete(state.whitelist, payload.username);
      } else if (payload.type === 'load') {
        state.whitelist = payload.whitelist;
      }
    },
    SCREEN_NAME_CHECK_DONE(state, result) {
      console.log('(botcheck) mutation: SCREEN_NAME_CHECK_DONE');
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
    WHITELIST_OPEN(state) {
      console.log('(botcheck) mutation: WHITELIST_OPEN');
      state.dialogs.whitelist.visible = true;
    },
    WHITELIST_CLOSE(state) {
      console.log('(botcheck) mutation: WHITELIST_CLOSE');
      state.dialogs.whitelist.visible = false;
    },
    LEARN_MORE(context) {
      console.log('(botcheck) mutation: LEARN_MORE');
      window.open('https://botcheck.me');
    },
    REPORT_TWEET(context) {
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
    AUTH_TWITTER(context) {
      console.log('(botcheck) action: AUTH_TWITTER');
      const browserToken = botcheckUtils.generateBrowserToken();
      window.open(`${botcheckConfig.apiRoot}/ExtensionLogin?token=${browserToken}`);
      // Now the background script auth-listener.js should see the login and trigger a response.
    },
    DEEP_SCAN(context, args) {
      console.log('(botcheck) action: DEEP_SCAN');
      if (!context.state.apiKey) {
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't do whitelisted accounts, return not a bot
      if (context.state.whitelist[args.screenName]) {
        context.commit('SCREEN_NAME_CHECK_DONE', { realname: args.realName, username: args.screenName, prediction: false });
        return;
      }

      // Don't check network again if we've already done the check
      // This will reset on browser restart
      if (context.state.results[args.screenName]) {
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
      if (!context.state.apiKey) {
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't do whitelisted accounts, return not a bot
      if (context.state.whitelist[args.screenName]) {
        context.commit('SCREEN_NAME_CHECK_DONE', { realname: args.realName, username: args.screenName, prediction: false });
        return;
      }

      // Don't check network again if we've already done the check
      // This will reset on browser restart
      if (context.state.results[args.screenName]) {
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
      console.log('(botcheck) action: ADD_TO_WHITELIST');
      if (!context.state.whitelist) {
        context.state.whitelist = [];
      }

      // add user to whitelist and save (if it's not already in the list)
      const existing = context.state.whitelist[args.screenName];
      if (!existing) {
        context.commit('WHITELIST_SET', { type: 'add', user: args });
      }
    },
    REMOVE_FROM_WHITELIST(context, screenName) {
      console.log('(botcheck) action: REMOVE_FROM_WHITELIST');
      if (!context.state.whitelist) {
        context.state.whitelist = [];
      }

      // remove user from whitelist and save
      context.commit('WHITELIST_SET', { type: 'delete', username: screenName });
    },
    DISAGREE(context, prediction) {
      console.log('(botcheck) action: DISAGREE');
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
