(function () {
  // Returns the value of the lang attribute of the <html> tag
  const getHtmlLang = () => {
    const html = document.querySelector('html');
    if (html.attributes['lang'] && html.attributes['lang'].value) {
      return html.attributes['lang'].value;
    } else {
      return 'en';
    }
  };

  // Retrieves localization JSON file
  const getJSONData = (lang) =>
    axios
      .get(`${botcheckConfig.internationalizationURL}/bins/kajnk`)
      .then(result => result.data);

  // Replaces all ocurrences of a string (safely)
  const replaceAll = (str, find, replace) => {
    function escapeRegExp(str) {
      return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
  };

  /**
   * Exposed functionality
   */

  BC.internationalization = {};

  BC.internationalization.data = null;

  BC.internationalization.load = () => {
    const lang = getHtmlLang();

    return getJSONData(lang)
      .then((data) => {
        BC.internationalization.data = data;

        console.log('(botcheck) Loaded internationalization data:');
        console.log(data);

        BC.internationalization.callbacks.forEach(fn =>
          fn(BC.internationalization.getString)
        );
      });
  };

  /**
   * getString: Returns a localized string given its key
   *
   * @param key Identifies the string to be retrieved
   * @param filler An object holding values to fill the string with
   *
   * A key representing a string "Hello %%name%%" received with a filler
   * object of { name: 'John' } returns "Hello John".
   *
   * %% %% was used instead of the more common {{ }} due to Vue already
   * using the latter.
   */
  BC.internationalization.getString = (key, filler = {}) => {
    if (!BC.internationalization.data) {
      throw new Error(`
        (botcheck) Called internationalization.getString()
        but there is no internationalization data.
      `);
    }
    if (!BC.internationalization.data[key]) {
      return '';
    }

    const string = BC.internationalization.data[key];

    let filledString = string;

    Object.keys(filler).forEach((key) => {
      filledString = replaceAll(string, `%%${key}%%`, filler[key]);
    });

    return filledString;
  };

  BC.internationalization.callbacks = [];

  /**
   * This function is called by scripts that need access to the
   * internationalization getString function.
   *
   * @param fn A callback which is called as soon as internationalization data
   *           is ready to use. BC.internationalization.getString is sent
   *           as a parameter for ease of use.
   */
  BC.internationalization.getInternationalizer = (fn) => {
    if (BC.internationalization.data) {
      fn(BC.internationalization.getString);
    } else {
      BC.internationalization.callbacks.push(fn);
    }
  }
})();
