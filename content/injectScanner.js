let initialData = initData();

// This is a big serialized JSON object twitter puts onto the page
// We are just using it to get the current user's screen name
function initData() {
  if (!document.querySelector('#init-data')) {
    return;
  }

  let jsonData;

  try {
    jsonData = JSON.parse(document.querySelector('#init-data').value);
  } catch (ex) {
    errorHandler(ex);
  }

  return jsonData;
}

function injectButtons() {
  // This first tries to inject the buttons on tweets/profiles already on the page
  // Tweets
  document.querySelectorAll('.tweet.js-stream-tweet').forEach(function(tweet) {
    processTweetEl(tweet, true);
  });
  // Permalink tweets
  document.querySelectorAll('.tweet.permalink-tweet').forEach(function(tweet) {
    processTweetEl(tweet, false);
  });
  document.querySelectorAll('.ProfileHeaderCard, .ProfileCard').forEach(processProfileEl);

  // Then we set up an observer to do the same for any future tweets/profiles
  // that get added to the DOM because e.g. the user scrolled down or opened a tweet
  let observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(addedNode => {
        if (!addedNode.querySelectorAll) {
          return;
        }
        // Retweet
        if (addedNode.classList.contains('tweet') && addedNode.classList.contains('js-stream-tweet')) {
          processTweetEl(addedNode, false, true);
        }
        // Tweets
        addedNode.querySelectorAll('.tweet.js-stream-tweet').forEach(function(tweet) {
          processTweetEl(tweet, true, false);
        });
        // Permalink tweets
        addedNode.querySelectorAll('.tweet.permalink-tweet').forEach(function(tweet) {
          processTweetEl(tweet, false, false);
        });
        // Profile pages
        addedNode.querySelectorAll('.ProfileHeaderCard, .ProfileCard').forEach(processProfileEl);
        // Hover profiles
        if (addedNode.classList.contains('ProfileCard')) {
          processProfileEl(addedNode);
        }
      });
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Process a Tweet and add the Botcheck button to it
function processTweetEl(tweetEl, isFeed, isRetweet) {
  if (!tweetEl.dataset || !tweetEl.dataset.screenName || tweetEl.dataset.botcheckInjected) {
    return;
  }

  tweetEl.dataset.botcheckInjected = true;

  let screenName = getScreenNameFromElement(tweetEl);
  let isProfile = false;

  let el = document.createElement('div');
  el.classList = 'botcheck-feed-container';
  el.innerHTML = '<botcheck-status :screen-name="screenName" :is-feed="isFeed" :is-retweet="isRetweet" :is-profile="isProfile"></botcheck-status>';

  if (isRetweet) {
    tweetEl.querySelector('.stream-item-header').appendChild(el);
  }
  else {
    tweetEl.querySelector('.ProfileTweet-actionList').appendChild(el);
  }

  new Vue({
    el,
    store,
    data() {
      return {
        screenName,
        isFeed,
        isRetweet,
        isProfile
      };
    },
    mounted: function() {
      store.broadcastAction('LIGHT_SCAN', this.screenName);
    }
  });
}

// Process a Profile and add the Botcheck button to it
function processProfileEl(profileEl) {
  if (!profileEl || profileEl.dataset.botcheckInjected) {
    return;
  }

  profileEl.dataset.botcheckInjected = true;

  let screenName = getScreenNameFromElement(profileEl);
  let isProfile = true;

  if (!screenName) return;

  // Skip putting button on own profile
  if (screenName === initialData.screenName) {
    return;
  }

  // Insert with other metadata
  let el = document.createElement('div');
  el.innerHTML = '<botcheck-status :screen-name="screenName" :is-profile="isProfile"></botcheck-status>';
  profileEl
    .querySelector('.ProfileHeaderCard-bio')
    .insertAdjacentElement('afterend', el);

  new Vue({
    el,
    store,
    data() {
      return {
        screenName,
        isProfile
      };
    },
    mounted: function() {
      store.broadcastAction('DEEP_SCAN', this.screenName);
    }
  });
}

// You can pass in a tweet or profile DOM node and get the screen name here
function getScreenNameFromElement(element) {
  if (!element) {
    return;
  }

  if (element.dataset && element.dataset.screenName) {
    return element.dataset.screenName;
  } else if (
    element.querySelector('[data-screen-name]') &&
    element.querySelector('[data-screen-name]').dataset.screenName
  ) {
    return element.querySelector('[data-screen-name]').dataset.screenName;
  }
}
