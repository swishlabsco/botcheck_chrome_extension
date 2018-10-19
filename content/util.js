/**
 * /content/util.js
 *
 * Utility object.
 */

const botcheckUtils = { // eslint-disable-line no-unused-vars
  generateBrowserToken: () => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < 15; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  },
  // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  generateUuid: () => {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  },
  extractTextFromHTML: (string) => {
    const doc = new DOMParser().parseFromString(string, 'text/html');
    return doc.body.textContent || '';
  }
};

BC.util = {
  parseQueryString(queryString) {
    const query = {};
    const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');

    pairs.forEach((i) => {
      const pair = i.split('=');
      query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    });

    return query;
  },
  onDOMReady(fn) {
    /**
     * Because `DOMContentLoaded` only fires once, and in safari we need the page to be ready before doing any html.
     * This function will also fire even if the event already happened.
     */
    if (document.readyState != 'loading') {
      fn();
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      document.attachEvent('onreadystatechange', function () {
        if (document.readyState != 'loading')
          fn();
      });
    }
  }
};