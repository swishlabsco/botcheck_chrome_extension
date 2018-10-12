Vue.use(Vuex);

let store = new Vuex.Store({
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
  actions: {
    AUTH_TWITTER(context) {
      console.log('action: AUTH_TWITTER');
      if (context.state.authTabId === -1) {
        let browserToken = botcheckUtils.generateBrowserToken();
        chrome.tabs.create(
          {
            url: `${botcheckConfig.apiRoot}/ExtensionLogin?token=${browserToken}`
          },
          authTab => {
            context.commit('AUTH_TAB_SET', authTab);
            chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
              // Note: this event is fired twice:
              // Once with `changeInfo.status` = "loading" and another time with "complete"
              if (changeInfo.status === 'complete' && tab.url.indexOf('https://twitter.com/?apikey=') === 0) {
                const url = new URL(tab.url);
                const query = botcheckUtils.parseQueryString(url.search);
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
      console.log('action: REMOVE_FROM_WHITELIST');
      if (!context.state.whitelist) {
        context.state.whitelist = [];
      }

      // remove user from whitelist and save
      context.commit('WHITELIST_SET', { type: 'delete', username: screenName });
    },
    DISAGREE(context, prediction) {
      console.log('action: DISAGREE');
      axios.post(`${botcheckConfig.apiRoot}/disagree`, {
        prediction,
        username: context.state.dialogs.results.screenName,
        apikey: context.state.apiKey
      });
    },
    LOG(context, payload) {
      console.log('action: LOG');
      // Log errors/messages/etc to remote logger
      let uuid = botcheckUtils.generateUuid();
      try {
        axios.post('https://log.declaredintent.com/entries', {
          namespace: 'me.botcheck.chrome-extension',
          useragent: navigator && navigator.userAgent,
          payload,
          uuid
        });
      } catch (ex) {
        console.error('Unable to log to declared intent. Attempted to send payload:');
        console.error(payload);
      }
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
        Vue.set(state.whitelist, payload.user.username, payload.user);
      } else if (payload.type === 'delete') {
        Vue.delete(state.whitelist, payload.username);
      } else {
        state.whitelist = payload.whitelist;
      }
    },
    SCREEN_NAME_CHECK_DONE(state, result) {
      console.log('SCREEN_NAME_CHECK_DONE');
      Vue.set(state.results, result.username, result);
      state.dialogs.results.loading = false;
    },
    RESULTS_OPEN(state, screenName) {
      console.log('RESULTS_OPEN');
      state.dialogs.results.visible = true;
      state.dialogs.results.screenName = screenName;
    },
    RESULTS_CLOSE(state) {
      console.log('RESULTS_CLOSE');
      state.dialogs.results.visible = false;
      state.dialogs.results.screenName = '';
    },
    THANKS_OPEN(state) {
      console.log('THANKS_OPEN');
      state.dialogs.thanks.visible = true;
    },
    THANKS_CLOSE(state) {
      console.log('THANKS_CLOSE');
      state.dialogs.thanks.visible = false;
    },
    WHITELIST_OPEN(state) {
      console.log('WHITELIST_OPEN');
      state.dialogs.whitelist.visible = true;
    },
    WHITELIST_CLOSE(state) {
      console.log('WHITELIST_CLOSE');
      state.dialogs.whitelist.visible = false;
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
      const msg = args.prediction === true ? 'likely' : 'not+likely';
      chrome.tabs.create({
        url: `https://twitter.com/intent/tweet/?text=I+just+found+out+@${args.screenName}+is+${msg}+a+propaganda+account%2C+by+using+the+botcheck+browser+extension%21+You+can+download+it+from+https%3A%2F%2Fbotcheck.me+and+check+for+yourself.`
      });
    }
  }
});

// Listen for incoming state changes from the background, and commit
// them to our local store, thus giving the illusion of a unified data
// store across background and all tabs with our extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log(request.name, request.payload);
  if (request.name === 'STATE_UPDATE') {
    store.commit('REMOTE_STATE_UPDATE', request.payload);
  } else if (request.name === 'STATE_INIT') {
    store.commit('REMOTE_STATE_UPDATE', request.payload);
    // Once the initial state arrives, inject the UI
    botcheckScanner.injectDialogs();
    botcheckScanner.injectButtons();
  }
});

// Send any uncaught exceptions up to log collector
Vue.config.errorHandler = (error, vm, info) => {
  console.error(error);
  store.dispatch('LOG', {
    message: error.message,
    stack: error.stack,
    error: error.error,
    filename: error.filename,
    vueInfo: info
  });
};

// Load api key and whitelist from chrome storage on startup
chrome.storage.sync.get(null, state => {
  if (state.apiKey) {
    store.commit('AUTH_APIKEY_SET', state.apiKey);
  }
  if (state.whitelist) {
    store.commit('WHITELIST_SET', { type: 'load', whitelist: state.whitelist });
  }
});

// Save api key to chrome storage when API key changes
store.subscribe((mutation, state) => {
  if (mutation.type === 'AUTH_APIKEY_SET' && mutation.payload) {
    chrome.storage.sync.set({ apiKey: mutation.payload });
  } else if (mutation.type === 'WHITELIST_SET') {
    chrome.storage.sync.set({ whitelist: state.whitelist });
  }
});
