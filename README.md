# Botcheck.me Chrome Extension

A chrome extension that uses machine learning techniques to detect propaganda accounts on Twitter.

## Details

This extension uses [Vue.js](https://vuejs.org/) with [element](http://element.eleme.io) for UI components, along with [Vuex](https://vuex.vuejs.org/en/intro.html) to manage state.

## Architecture

The extension injects various Vue components into twitter, as well as one Vuex store.
A background script is used to listen for authentication, and another as a centralized point for interacting with the browser's storage.

The Vuex store is only accessible by the content scripts that have been injected into the same tab.

### Whitelist

The whitelist is managed both on the Twitter interface (whitelisting users) as well as on the extension popup (removing users from whitelist).

Synchronization between these two parts is achieved by storing changes on the browser.
Both sides use the browser storage as the source of truth for both fetching/updating the data and for listening for changes.

The content scripts keep an up to date version of the whitelist in the Vuex store, in order to quickly be able to check for the presence of a username.

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
