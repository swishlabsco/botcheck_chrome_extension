# Botcheck.me Chrome Extension

A chrome extension that uses machine learning techniques to detect propaganda accounts on Twitter.

## Details

This extension uses [Vue.js](https://vuejs.org/) with [element](http://element.eleme.io) for UI components, along with [Vuex](https://vuex.vuejs.org/en/intro.html) to manage state.

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

Make sure `manifest.json` is using the minified versions of scripts such as Vue and Vuex.

## Further reading

* [Chrome extension development](https://developer.chrome.com/extensions)
* [Botcheck.me](https://botcheck.me)
