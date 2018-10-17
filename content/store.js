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
        username: '',
        realName: '',
        whitelisted: false
      },
      thanks: {
        visible: false
      }
    },
    message: 'Scanning...',
    results: {
      /*
      exampleUsername: {
        deepScan: false, // Wether the result is from a deep scan
        prediction: false,
        realName: 'exampleRealName',
        username: 'exampleUsername'
      }
      */
    },
    whitelist: {
      /*
      exampleUsername: {
        realName: 'exampleRealName'
      }
      */
    }
  },
  mutations: {
    AUTH_APIKEY_SET(state, apiKey) {
      console.log('(botcheck) mutation: AUTH_APIKEY_SET');
      state.apiKey = apiKey;
    },
    LOAD_RESULTS(state, results) {
      // This should be called when we detect a change to browser storage
      state.results = results;
    },
    DONOTCALLDIRECTLY_LOAD_WHITELIST(state, whitelist) {
      // This mutation should only be called by the LOAD_WHITELIST action
      state.whitelist = whitelist;
    },
    RESULTS_OPEN(state, { username, realName, whitelisted }) {
      console.log('(botcheck) mutation: RESULTS_OPEN');
      state.dialogs.results = {
        visible: true,
        username,
        realName,
        whitelisted
      };
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
    SHARE(state, { username, prediction }) {
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
    LOAD_WHITELIST(context, newWhitelist) {
      console.log('(botcheck) action: LOAD_WHITELIST. Whitelist:');
      console.log(newWhitelist);

      // Get list of users removed from whitelist
      // and if no status is found locally, run deep scan
      Object.keys(context.state.whitelist).forEach((username) => {
        if (!newWhitelist[username]) {
          context.dispatch('SCAN', {
            deepScan: true,
            username,
            realName: context.state.whitelist[username].realName,
            ignoreWhitelist: true
          });
        }
      });
      context.commit('DONOTCALLDIRECTLY_LOAD_WHITELIST', newWhitelist);
    },
    SCAN(context, {
      username,
      realName,
      ignoreWhitelist,
      deepScan
    }) {
      console.log(`(botcheck) action: SCAN. Username: ${username} deepScan: ${deepScan}`);

      if (!realName || !username) {
        console.error(`
          (botcheck) Called scan without real name or username.
          realName: ${realName}
          username: ${username}
        `);
        return;
      }
      if (!context.state.apiKey) {
        console.log('(botcheck) Called scan but store has no API key. Triggering authentication...');
        context.dispatch('AUTH_TWITTER');
        return;
      }

      // Don't check whitelisted accounts
      if (!ignoreWhitelist && context.state.whitelist[username]) {
        console.log(`${username} is whitelisted, aborting scan`);
        return;
      }

      // Don't check network again if this is a light scan
      // and we already have a result (from a deep scan or not)
      const previousResult = context.state.results[username];
      if (!deepScan && previousResult) {
        console.log(`(botcheck) Light scan requested for ${username}, but result found. Aborting scan.`);
        return;
      }

      let endpoint;
      if (deepScan) {
        endpoint = '/DeepScan';
      } else {
        endpoint = '/LightScan';
      }

      axios
        .post(`${botcheckConfig.apiRoot}${endpoint}`, {
          username,
          apikey: context.state.apiKey
        })
        .then((result) => {
          if (result && result.data) {
            console.log(`${username} has been${(deepScan ? ' deep ' : ' light ')}scanned. Prediction: ${result.data.prediction}`);

            if (result.data.error) {
              let logType = console.error;
              if (result.data.error === 'This user does not exist.') {
                // Happens on private profiles
                logType = console.log;
              }
              logType('(botcheck) Error while running scan:');
              logType(result.data.error);
            }

            context.dispatch('STORE_RESULT', {
              deepScan,
              realName,
              username: result.data.username,
              prediction: result.data.prediction
            });
            context.dispatch('LOG', result.data);
          }
        })
        .catch((e) => {
          console.error(e);
          console.error('Unable to run scan.');
        });
    },
    STORE_RESULT(context, result) {
      // A result is a response from the API after a user is scanned.
      //
      // First we store the result in this Vuex store,
      // then we queue a browser storage update.
      // This way, when a lot of storage requests are made at the same time,
      // they are all up to date.
      // If we didn't first store the result in the Vuex store, consequent updates
      // could be missing previous updates. But this is not enough:
      // If we didn't queue the update, chrome could be inconsistent with the storage
      // ordering and create a race condition.

      const previousResult = context.state.results[result.username];
      if (previousResult && previousResult.deepScan && !result.deepScan) {
        console.log(`
          (botcheck) Tried storing light scan result for ${result.username},
          but deep scan result was already stored. Aborting.
        `);
        return;
      }
      if (previousResult) {
        console.log(`(botcheck) Overwriting result for user ${result.username}`);
      }
      context.state.results[result.username] = result;

      // Send message to backend script
      // Queueing storage updates avoids race condition
      chrome.runtime.sendMessage({
        type: 'botcheck-queue-storage-update',
        info: result.username,
        update: {
          results: context.state.results
        }
      });
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
