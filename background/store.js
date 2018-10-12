Vue.use(Vuex);

let apiRoot = 'https://botcheck2-dot-surfsafe-rbl.appspot.com';

let store = new Vuex.Store({
  state: {
    apiKey: '',
    clientTabId: -1,
    authTabId: -1,
    // Anything in 'synced' will automatically be synchronized
    // with any injected content scripts running in tabs
    synced: {
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
    }
  },
  actions: {
    AUTH_TWITTER(context) {
      console.log('action: AUTH_TWITTER');
      if (context.state.authTabId === -1) {
        let browserToken = generateBrowserToken();
        chrome.tabs.create(
          {
            url: `${apiRoot}/ExtensionLogin?token=${browserToken}`
          },
          authTab => {
            context.commit('AUTH_TAB_SET', authTab);
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                // Note: this event is fired twice:
                // Once with `changeInfo.status` = "loading" and another time with "complete"
                if (changeInfo.status === 'complete' && tab.url.indexOf('https://twitter.com/?apikey=') == 0) {
                  var url = new URL(tab.url);
                  var query = botcheck_utils.parseQueryString(url.search);
                  context.commit('AUTH_APIKEY_SET', query.apikey);
                }
            });
          }
        );
      }
    },
    DEEP_SCAN(context, args) {
      console.log('action: DEEP_SCAN');
      if (!context.state.apiKey) {
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't do whitelisted accounts, return not a bot
      if (context.state.synced.whitelist[args.screenName]) {
        context.commit('SCREEN_NAME_CHECK_DONE', { realname: args.realName, username: args.screenName, prediction: false });
        return;
      }

      // Don't check network again if we've already done the check
      // This will reset on browser restart
      if (context.state.synced.results[args.screenName]) {
        context.commit('SCREEN_NAME_CHECK_DONE', context.state.synced.results[args.screenName]);
        return;
      }

      axios
        .post(`${apiRoot}/DeepScan`, {
          username: args.screenName,
          apikey: context.state.apiKey
        })
        .then(result => {
          if (result && result.data) {
            result.data.realname = args.realName;
            context.commit('SCREEN_NAME_CHECK_DONE', result.data);
            context.dispatch('LOG', result.data);
          }
        });
    },
    LIGHT_SCAN(context, args) {
      console.log('action: LIGHT_SCAN');
      if (!context.state.apiKey) {
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't do whitelisted accounts, return not a bot
      if (context.state.synced.whitelist[args.screenName]) {
        context.commit('SCREEN_NAME_CHECK_DONE', { realname: args.realName, username: args.screenName, prediction: false });
        return;
      }

      // Don't check network again if we've already done the check
      // This will reset on browser restart
      if (context.state.synced.results[args.screenName]) {
        context.commit('SCREEN_NAME_CHECK_DONE', context.state.synced.results[args.screenName]);
        return;
      }

      axios
        .post(`${apiRoot}/LightScan`, {
          username: args.screenName,
          apikey: context.state.apiKey
        })
        .then(result => {
          if (result && result.data) {
            result.data.realname = args.realName;
            context.commit('SCREEN_NAME_CHECK_DONE', result.data);
            context.dispatch('LOG', result.data);
          }
        });
    },
    ADD_TO_WHITELIST(context, args) {
      console.log('action: ADD_TO_WHITELIST');
      if (!context.state.synced.whitelist) {
        context.state.synced.whitelist = [];
      }

      // add user to whitelist and save (if it's not already in the list)
      var existing = context.state.synced.whitelist[args.screenName];
      if (!existing) {
        context.commit('WHITELIST_SET', { type: 'add', user: args });
      }
    },
    REMOVE_FROM_WHITELIST(context, screenName) {
      console.log('action: REMOVE_FROM_WHITELIST');
      if (!context.state.synced.whitelist) {
        context.state.synced.whitelist = [];
      }

      // remove user from whitelist and save
      context.commit('WHITELIST_SET', { type: 'delete', username: screenName });
    },
    DISAGREE(context, prediction) {
      console.log('action: DISAGREE');
      axios.post(`${apiRoot}/disagree`, {
        prediction,
        username: context.state.synced.dialogs.results.screenName,
        apikey: context.state.apiKey
      });
    },
    LOG(context, payload) {
      console.log('action: LOG');
      // Log errors/messages/etc to remote logger
      let uuid = generateUuid();
      try {
        axios.post('https://log.declaredintent.com/entries', {
          namespace: 'me.botcheck.chrome-extension',
          useragent: navigator && navigator.userAgent,
          payload,
          uuid
        });
      } catch (ex) {}
    }
  },
  mutations: {
    CLIENT_TAB_SET(state, tabId) {
      console.log('CLIENT_TAB_SET');
      state.clientTabId = tabId;
    },
    AUTH_APIKEY_SET(state, apiKey) {
      console.log('AUTH_APIKEY_SET');
      state.apiKey = apiKey;
    },
    WHITELIST_SET(state, payload) {
      console.log('WHITELIST_SET');
      if (payload.type === 'add') {
        Vue.set(state.synced.whitelist, payload.user.username, payload.user);
      } else if (payload.type === 'delete') {
        Vue.delete(state.synced.whitelist, payload.username);
      } else {
        state.synced.whitelist = payload.whitelist;
      }
    },
    SCREEN_NAME_CHECK_DONE(state, result) {
      console.log('SCREEN_NAME_CHECK_DONE');
      Vue.set(state.synced.results, result.username, result);
      state.synced.dialogs.results.loading = false;
    },
    RESULTS_OPEN(state, screenName) {
      console.log('RESULTS_OPEN');
      state.synced.dialogs.results.visible = true;
      state.synced.dialogs.results.screenName = screenName;
    },
    RESULTS_CLOSE(state) {
      console.log('RESULTS_CLOSE');
      state.synced.dialogs.results.visible = false;
      state.synced.dialogs.results.screenName = '';
    },
    THANKS_OPEN(state) {
      console.log('THANKS_OPEN');
      state.synced.dialogs.thanks.visible = true;
    },
    THANKS_CLOSE(state) {
      console.log('THANKS_CLOSE');
      state.synced.dialogs.thanks.visible = false;
    },
    WHITELIST_OPEN(state) {
      console.log('WHITELIST_OPEN');
      state.synced.dialogs.whitelist.visible = true;
    },
    WHITELIST_CLOSE(state) {
      console.log('WHITELIST_CLOSE');
      state.synced.dialogs.whitelist.visible = false;
    },
    AUTH_TAB_SET(state, tabId) {
      console.log('AUTH_TAB_SET');
      state.authTabId = tabId;
    },
    LEARN_MORE(context) {
      console.log('LEARN_MORE');
      chrome.tabs.create({
        url: 'https://botcheck.me'
      });
    },
    REPORT_TWEET(context) {
      console.log('REPORT_TWEET');
      chrome.tabs.create({
        url: 'https://help.twitter.com/en/rules-and-policies/twitter-report-violation'
      });
    },
    SHARE(context, args) {
      console.log('SHARE');
      var msg = args.prediction === true ? 'likely' : 'not+likely';
      chrome.tabs.create({
        url: `https://twitter.com/intent/tweet/?text=I+just+found+out+@${args.screenName}+is+${msg}+a+propaganda+account%2C+by+using+the+botcheck+browser+extension%21+You+can+download+it+from+https%3A%2F%2Fbotcheck.me+and+check+for+yourself.`
      });
    }
  }
});
