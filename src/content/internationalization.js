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
      .get(`${botcheckConfig.localizationURL}/b/5c34d42705d34b26f2049067`)
      .then(result => result.data);

  /**
   * Exposed functionality
   */
  BC.internationalization = {
    data: null,

    load: () => {
      const lang = getHtmlLang();

      return getJSONData(lang)
        .then((data) => {
          BC.internationalization.data = data;
        });
    },

    getString: (key) => {
      if (!BC.internationalization.data) {
        throw new Error(`
          (botcheck) Called internationalization.getString()
          but there is no internationalization data.
        `);
      }
      if (!BC.internationalization.data[key]) {
        return '';
      }
      return BC.internationalization.data[key];
    }
  };
})();
