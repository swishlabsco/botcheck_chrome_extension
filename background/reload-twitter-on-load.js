// Reloads every twitter tab when this backround page loads.
// This is useful when a users installs the extension with a twitter tab open,
// and then goes to that tab expecting to see it in action.
chrome.tabs.query({ url: 'https://twitter.com/*' }, (tabs) => {
  tabs.forEach(tab => chrome.tabs.reload(tab.id));
});
