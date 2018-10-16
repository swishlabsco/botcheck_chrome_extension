/**
 * /content/scanner.js
 *
 * Utility object for handling the Twitter DOM.
 */

let botcheckCacheScreenName;

const botcheckScanner = {

  // This is a big serialized JSON object twitter puts onto the page
  // We are just using it to get the current user's screen name
  getScreenName: () => {
    if (botcheckCacheScreenName) {
      return botcheckCacheScreenName;
    }
    if (!document.querySelector('#init-data')) {
      return;
    }

    let jsonData;
    try {
      jsonData = JSON.parse(document.querySelector('#init-data').value);
    } catch (ex) {
      botcheckUtils.errorHandler(ex);
    }

    botcheckCacheScreenName = jsonData.screenName;
    return botcheckCacheScreenName;
  },

  injectButtons: () => {
    // Inject buttons on tweets/profiles already on the page
    document.querySelectorAll('.tweet.js-stream-tweet').forEach((tweet) => {
      botcheckScanner.processTweetEl(tweet, true);
    });
    document.querySelectorAll('.tweet.permalink-tweet').forEach((tweet) => {
      botcheckScanner.processTweetEl(tweet, false);
    });
    document.querySelectorAll('.ProfileHeaderCard, .ProfileCard').forEach(botcheckScanner.processProfileEl);

    // Then we set up an observer to do the same for any future tweets/profiles
    // that get added to the DOM because e.g. the user scrolled down or opened a tweet
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((addedNode) => {
          if (!addedNode.querySelectorAll) {
            return;
          }
          // Retweet prompt
          if (addedNode.classList.contains('tweet') && addedNode.classList.contains('js-stream-tweet')) {
            botcheckScanner.processTweetEl(addedNode, { isRetweet: true });
          }
          // Tweets
          addedNode.querySelectorAll('.tweet.js-stream-tweet').forEach((tweet) => {
            botcheckScanner.processTweetEl(tweet, { isFeed: true });
          });
          // Permalink tweets
          addedNode.querySelectorAll('.tweet.permalink-tweet').forEach((tweet) => {
            botcheckScanner.processTweetEl(tweet);
          });
          // Profile pages
          addedNode.querySelectorAll('.ProfileHeaderCard, .ProfileCard').forEach(botcheckScanner.processProfileEl);
          // Hover profiles
          if (addedNode.classList.contains('ProfileCard')) {
            botcheckScanner.processProfileEl(addedNode);
          }
        });
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  injectDialogs: () => {
    const el = document.createElement('div');
    el.innerHTML = `
      <dialog-results></dialog-results>
      <dialog-thanks></dialog-thanks>
    `;
    document.body.appendChild(el);
    new Vue({ el, store }); // eslint-disable-line no-new
  },

  // Process a Tweet and add the Botcheck button to it
  processTweetEl: (tweetEl, { isFeed = false, isRetweet = false }) => {
    if (!tweetEl.dataset || !tweetEl.dataset.screenName || tweetEl.dataset.botcheckInjected) {
      return;
    }

    tweetEl.dataset.botcheckInjected = true;

    const screenName = botcheckScanner.getScreenNameFromElement(tweetEl);
    if (!screenName) {
      console.error('(botcheck) Could not extract screenName from tweet.');
    }
    const realName = botcheckScanner.getRealNameFromElement(tweetEl);
    if (!realName) {
      console.error('(botcheck) Could not extract realName from tweet.');
    }

    const el = document.createElement('div');
    el.classList = 'botcheck-feed-container';
    el.innerHTML = '<botcheck-status :real-name="realName" :screen-name="screenName" :is-feed="isFeed" :is-retweet="isRetweet" :is-profile="isProfile"></botcheck-status>';

    if (isRetweet) {
      tweetEl.querySelector('.stream-item-header').appendChild(el);
    } else {
      tweetEl.querySelector('.ProfileTweet-actionList').appendChild(el);
    }

    new Vue({ // eslint-disable-line no-new
      el,
      store,
      data() {
        return {
          realName,
          screenName,
          isFeed,
          isRetweet,
          isProfile: false
        };
      },
      mounted() {
        store.dispatch('LIGHT_SCAN', { realName: this.realName, screenName: this.screenName });
      }
    });
  },

  // Process a Profile and add the Botcheck button to it
  processProfileEl: (profileEl) => {
    if (!profileEl || profileEl.dataset.botcheckInjected) {
      return;
    }

    profileEl.dataset.botcheckInjected = true;

    const screenName = botcheckScanner.getScreenNameFromElement(profileEl);
    const realName = botcheckScanner.getRealNameFromElement(profileEl);
    const isProfile = true;

    if (!screenName) {
      console.error('(botcheck) Tried processing profile element with no screenName.');
      return;
    }

    // Skip putting button on own profile
    if (screenName === botcheckScanner.getScreenName()) {
      return;
    }

    // Insert with other metadata
    const el = document.createElement('div');
    el.innerHTML = '<botcheck-status :real-name="realName" :screen-name="screenName" :is-profile="isProfile"></botcheck-status>';

    // Get bio and insert after if it exists
    const bio = profileEl.querySelector('.ProfileHeaderCard-bio');
    if (bio) {
      bio.insertAdjacentElement('afterend', el);
    }

    new Vue({ // eslint-disable-line no-new
      el,
      store,
      data() {
        return {
          realName,
          screenName,
          isProfile
        };
      },
      mounted: function () { // eslint-disable-line object-shorthand
        console.log(`(botcheck) Finished mounting on profile element for user ${screenName}. Running deep scan...`);
        store.dispatch('DEEP_SCAN', { realName: this.realName, screenName: this.screenName });
      }
    });
  },

  // You can pass in a tweet or profile DOM node and get the screen name here
  getScreenNameFromElement: (element) => {
    if (!element) {
      return;
    }

    if (element.dataset && element.dataset.screenName) {
      return element.dataset.screenName;
    }

    if (
      element.querySelector('[data-screen-name]')
      && element.querySelector('[data-screen-name]').dataset.screenName
    ) {
      return element.querySelector('[data-screen-name]').dataset.screenName;
    }
  },

  // You can pass in a tweet or profile DOM node and get the real name here
  getRealNameFromElement: (element) => {
    if (!element) {
      return;
    }

    if (element.dataset && element.dataset.name) {
      return element.dataset.name;
    }
    if (
      element.querySelector('[data-name]')
      && element.querySelector('[data-name]').dataset.name
    ) {
      return element.querySelector('[data-name]').dataset.name;
    }

    // For the profile card, the real name cannot be found in a [data-name] attribute
    const header = element.querySelector('h1.ProfileHeaderCard-name');

    if (header) {
      const anchor = header.querySelector('a.ProfileHeaderCard-nameLink');

      if (anchor && anchor.innerHTML) {
        return anchor.innerHTML;
      }
    }
  }
};
