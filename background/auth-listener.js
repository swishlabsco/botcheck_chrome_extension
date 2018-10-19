/**
 * /background/auth-listener.js
 *
 * Listens for Botcheck authentication and lets the extension know when it happens.
 * Needs to be a background script because it uses the chrome.tabs API.
 */

function parseQueryString(queryString) {
  const query = {};
  const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');

  pairs.forEach((i) => {
    const pair = i.split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  });

  return query;
}

// Listen for authentication
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Note: this event is fired twice:
  // Once with `changeInfo.status` = "loading" and another time with "complete"
  // We use "loading" to make sure key is extracted asap but only once
  if (changeInfo.status === 'loading' && tab.url.indexOf('https://twitter.com/?apikey=') === 0) {
    const url = new URL(tab.url);
    const query = parseQueryString(url.search);

    // Close the tab that was used to return the API key (async)
    chrome.tabs.remove(tab.id);

    console.log('(botcheck background script) Received apikey successfully. Storing...');

    // Store the API key
    // The content scripts should be monitoring the storage and notice the change
    chrome.storage.local.set({
      apiKey: query.apikey
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to store API key in sync storage.');
        console.error(chrome.runtime.lastError);
      }
    });
  }
});
