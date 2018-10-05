Vue.use(Vuex);

let authApiRoot = 'https://ashbhat.pythonanywhere.com';
let apiRoot = 'https://botcheckdummy-dot-surfsafe-rbl.appspot.com';

let store = new Vuex.Store({
  state: {
    apiKey: '',
    clientTabId: -1,
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
        auth: {
          screenName: '',
          visible: false
        }
      },
      message: 'Scanning...',
      results: {
        exampleUserName: {
          username: 'exampleUserName',
          prediction: false,
          profile_image: ''
        }
      }
    }
  },
  actions: {
    AUTH_TWITTER(context) {
      let browserToken = generateBrowserToken();
      chrome.tabs.create(
        {
          url: `${apiRoot}/ExtensionLogin?token=${browserToken}`
        },
        authTab => {
          chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
              // Note: this event is fired twice:
              // Once with `changeInfo.status` = "loading" and another time with "complete"
              if (changeInfo.status === 'complete' && tab.url.indexOf('https://twitter.com/?apikey=') == 0) {
                var url = new URL(tab.url);
                var query = parseQueryString(url.search);
                context.commit('AUTH_APIKEY_SET', query.apikey);
              }
          });
        }
      );
    },
    DEEP_SCAN(context, screenName) {
      if (!context.state.apiKey) {
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't check network again if we've already done the check
      // This will reset on browser restart
      if (context.state.synced.results[screenName]) {
        context.commit('SCREEN_NAME_CHECK_DONE', context.state.synced.results[screenName]);
        return;
      }

      axios
        .post(`${apiRoot}/DeepScan`, {
          username: screenName,
          apikey: context.state.apiKey
        })
        .then(result => {
          if (result && result.data) {
            context.commit('SCREEN_NAME_CHECK_DONE', result.data);
            context.dispatch('LOG', result.data);
          }
        });
    },
    LIGHT_SCAN(context, screenName) {
      if (!context.state.apiKey) {
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't check network again if we've already done the check
      // This will reset on browser restart
      if (context.state.synced.results[screenName]) {
        context.commit('SCREEN_NAME_CHECK_DONE', context.state.synced.results[screenName]);
        return;
      }

      axios
        .post(`${apiRoot}/LightScan`, {
          username: screenName,
          apikey: context.state.apiKey
        })
        .then(result => {
          if (result && result.data) {
            context.commit('SCREEN_NAME_CHECK_DONE', result.data);
            context.dispatch('LOG', result.data);
          }
        });
    },
    DISAGREE(context, prediction) {
      axios.post(`${apiRoot}/disagree`, {
        prediction,
        username: context.state.synced.dialogs.results.screenName,
        apikey: context.state.apiKey
      });
    },
    LOG(context, payload) {
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
      state.clientTabId = tabId;
    },
    AUTH_APIKEY_SET(state, apiKey) {
      state.apiKey = apiKey;
    },
    SCREEN_NAME_CHECK_DONE(state, result) {
      Vue.set(state.synced.results, result.username, result);
      state.synced.dialogs.results.loading = false;
    },
    RESULTS_OPEN(state, screenName) {
      if (!state.synced.results[screenName]) {
        state.synced.dialogs.results.loading = true;
      }
      state.synced.dialogs.results.visible = true;
      state.synced.dialogs.results.screenName = screenName;
    },
    RESULTS_CLOSE(state) {
      state.synced.dialogs.results.visible = false;
      state.synced.dialogs.results.screenName = '';
    },
    THANKS_OPEN(state) {
      state.synced.dialogs.thanks.visible = true;
    },
    THANKS_CLOSE(state) {
      state.synced.dialogs.thanks.visible = false;
    },
    AUTH_OPEN(state, screenName) {
      state.synced.dialogs.auth.screenName = screenName;
      state.synced.dialogs.auth.visible = true;
    },
    AUTH_CLOSE(state) {
      state.synced.dialogs.auth.visible = false;
    },
    SHARE(context, screenName) {
      chrome.tabs.create({
        url: `https://twitter.com/intent/tweet/?text=I+just+found+out+@${screenName}+is+likely+a+propaganda+account%2C+by+using+the+botcheck+browser+extension%21+You+can+download+it+from+https%3A%2F%2Fbotcheck.me+and+check+for+yourself.`
      });
    }
  }
});

function parseQueryString(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}
