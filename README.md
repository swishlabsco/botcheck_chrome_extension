# Botcheck.me Chrome Extension

A chrome extension that uses machine learning techniques to detect propaganda accounts on Twitter.

## Details

This extension uses [Vue.js](https://vuejs.org/) with [element](http://element.eleme.io) for UI components, along with [Vuex](https://vuex.vuejs.org/en/intro.html) to manage state.

## Architecture

The extension injects various Vue components into twitter, as well as one Vuex store. Mostly content scripts are used, with a single background script being used to listen for authentication.

When the background script detects that the user was authenticated, it stores the API key and the content scripts detect that change. This means at the moment there is no need for sending messages between content and background scripts.

The Vuex store is injected into the page, restricted to the current tab, and only used by the content scripts in that tab. For the interaction between content scripts, the backend, and the popup, the browser storage is used as the single source of truth.

### Storing deep scan results locally

When a deep scan is run, the result is stored locally so that if the user clicks "Run bot scan" on a tweet, the same message won't appear on other tweets of the same author.

### Whitelist

The whitelist is managed both on the Twitter interface as well as on the extension popup. Synchronization between these two parts is achieved by storing changes on the browser. Both sides use the browser storage as the source of truth for both fetching/updating the data and for listening for changes.

## Running Eslint

The simplest way to set up eslint for this project is to use VSCode with the [eslint plugin](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).

Once that is done, simply install eslint and the eslint-airbnb-base dependency globally using npm:

`npm i -g eslint eslint-config-airbnb-base`

## Compiling Less stylesheets

* Install npm
* Run `npm install -g less less-watch-compiler`
* Run `less-watch-compiler less styles` to watch the `less` folder and automatically compile to `styles`.

[More information on the `less-watch-compiler` package here](https://www.npmjs.com/package/less-watch-compiler).

## Before packaging the extension

* Make sure `manifest.json` is using the minified versions of scripts such as Vue and Vuex.
* Set the proper configuration values in `config/config.js`.

## Further reading

* [Chrome extension development](https://developer.chrome.com/extensions)
* [Botcheck.me](https://botcheck.me)
