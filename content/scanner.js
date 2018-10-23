/**
 * /content/scanner.js
 *
 * Utility object for handling the Twitter DOM.
 */

let botcheckCacheUsername;

const botcheckScanner = {

  // This is a big serialized JSON object twitter puts onto the page
  // We are just using it to get the current user's screen name
  getUsername: () => {
    if (botcheckCacheUsername) {
      return botcheckCacheUsername;
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

    botcheckCacheUsername = jsonData.screenName;
    return botcheckCacheUsername;
  },

  injectButtons: () => {
    // Process tweets already on the page
    const feed = document.querySelector('.stream');
    if (feed) {
      feed.querySelectorAll('.tweet.js-stream-tweet').forEach((tweet) => {
        botcheckScanner.processTweetEl(tweet, { isFeed: true });
      });
    }
    document.querySelectorAll('.tweet.permalink-tweet').forEach((tweet) => {
      botcheckScanner.processTweetEl(tweet, { isPermalink: true });
    });
    // Process profile element if present on the page
    document.querySelectorAll('.ProfileHeaderCard, .ProfileCard').forEach(botcheckScanner.processProfileEl);

    // Set up an observer to listen for any future tweets/profiles
    // when the user scrolls down or opens a tweet
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((addedNode) => {
          if (!addedNode.querySelectorAll) {
            // Some nodes are just text
            return;
          }

          // Try to extract a tweet from the new node
          const result = botcheckScanner.extractTweetFromHTMLNode(addedNode);
          if (result.tweet) {
            botcheckScanner.processTweetEl(result.tweet, {
              isFeed: result.isFeed,
              isRetweet: result.isRetweet,
              isPermalink: result.isPermalink,
              isReply: result.isReply
            });
          }

          // Look for a profile card in the new node
          addedNode.querySelectorAll('.ProfileHeaderCard, .ProfileCard').forEach((profileCard) => {
            botcheckScanner.processProfileEl(profileCard);
          });
          if (
            addedNode.classList.contains('ProfileHeaderCard')
            || addedNode.classList.contains('ProfileCard')) {
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
  processTweetEl: (tweetEl, {
    isFeed = false,
    isRetweet = false,
    isReply = false,
    isPermalink = false
  } = {}) => {
    console.log('--------------------');
    console.log('Processing tweet: ');
    console.log({
      isFeed, isRetweet, isReply, isPermalink
    });
    console.log(tweetEl);

    if (!tweetEl.dataset || !tweetEl.dataset.screenName || tweetEl.dataset.botcheckInjected) {
      console.log(`
        (botcheck) Tried to process tweet element but it either had no dataset, no screenName, or already had been injected.
      `);
      return;
    }

    tweetEl.dataset.botcheckInjected = true;

    const username = botcheckScanner.getScreenNameFromElement(tweetEl);
    if (!username) {
      console.error('(botcheck) Could not extract username from tweet.');
    }
    const realName = botcheckScanner.getRealNameFromElement(tweetEl);
    if (!realName) {
      console.error('(botcheck) Could not extract realName from tweet.');
    }

    const el = document.createElement('div');
    el.classList = 'botcheck-feed-container';
    el.innerHTML = `
      <botcheck-status
        :real-name="realName"
        :username="username"
        :is-feed="isFeed"
        :is-retweet="isRetweet"
        :is-reply="isReply"
        :is-permalink="isPermalink"
        :is-profile="isProfile"
      ></botcheck-status>
    `;

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
          username,
          isFeed,
          isRetweet,
          isReply,
          isPermalink,
          isProfile: false
        };
      },
      mounted() {
        store.dispatch('SCAN', {
          deepScan: false,
          realName: this.realName,
          username: this.username
        });
      }
    });
  },

  // Process a Profile and add the Botcheck button to it
  processProfileEl: (profileEl) => {
    if (!profileEl || profileEl.dataset.botcheckInjected) {
      return;
    }

    profileEl.dataset.botcheckInjected = true;

    const username = botcheckScanner.getScreenNameFromElement(profileEl);
    const realName = botcheckScanner.getRealNameFromElement(profileEl);
    const isProfile = true;

    if (!username) {
      console.error('(botcheck) Tried processing profile element with no username.');
      console.error(profileEl);
      return;
    }

    // Skip putting button on own profile
    if (username === botcheckScanner.getUsername()) {
      return;
    }

    // Insert with other metadata
    const el = document.createElement('div');
    el.innerHTML = '<botcheck-status :real-name="realName" :username="username" :is-profile="isProfile"></botcheck-status>';

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
          username,
          isProfile
        };
      },
      mounted() {
        store.dispatch('SCAN', {
          deepScan: true,
          realName: this.realName,
          username: this.username
        });
      }
    });
  },

  // You can pass in a tweet or profile DOM node and get the screen name here
  getScreenNameFromElement: (element) => {
    if (!element) {
      return;
    }

    // For profile cards
    const header = element.querySelector('h2.ProfileHeaderCard-screenname');

    if (header) {
      const anchor = header.querySelector('a.ProfileHeaderCard-screennameLink');

      if (anchor) {
        const b = anchor.querySelector('span b');
        if (b) {
          const html = b.innerHTML;
          const username = botcheckScanner.extractTextFromHTML(html);
          return username;
        }
      }
    }

    // For other elements
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

    // For profile cards
    const header = element.querySelector('h1.ProfileHeaderCard-name');

    if (header) {
      const anchor = header.querySelector('a.ProfileHeaderCard-nameLink');

      if (anchor && anchor.innerHTML) {
        const html = anchor.innerHTML;
        const name = botcheckScanner.extractTextFromHTML(html);
        return name;
      }
    }

    // For other elements
    if (element.dataset && element.dataset.name) {
      return element.dataset.name;
    }
    if (
      element.querySelector('[data-name]')
      && element.querySelector('[data-name]').dataset.name
    ) {
      return element.querySelector('[data-name]').dataset.name;
    }
  },

  /**
   * Receives an HTML node and extracts a tweet node from it
   * (it can be the node itself or a child)
   * Returns an object in the format:
   * {
   *   tweet: HTML Node,
   *   isRetweet: boolean,
   *   isReply: boolean,
   *   isPermalink: boolean,
   *   isFeed: boolean
   * }
   */
  extractTweetFromHTMLNode: (node) => {
    if (!node.querySelectorAll) {
      return { tweet: null };
    }
    // Node has class .tweet: Happens for replies and retweets
    if (node.classList.contains('tweet')) {
      // Retweet
      if (node.parentElement.getAttribute('id') === 'retweet-tweet-dialog-body') {
        return {
          tweet: node,
          isRetweet: true
        };
      }
      // Reply
      if (node.parentElement.getAttribute('id') === 'global-tweet-dialog-body') {
        return {
          tweet: node,
          isReply: true
        };
      }
    }
    // Node has child with class .tweet: Happens for feed and permalink tweets
    const tweet = node.querySelector('.tweet');
    if (tweet) {
      // Permalink tweet
      if (node.classList.contains('permalink-container')) {
        return {
          tweet,
          isPermalink: true
        };
      }
      // Feed tweet
      if (node.classList.contains('js-stream-item')) {
        return {
          tweet,
          isFeed: true
        };
      }
    }
    return { tweet: null };
  },

  extractTextFromHTML: (string) => {
    const doc = new DOMParser().parseFromString(string, 'text/html');
    return doc.body.textContent || '';
  }
};
