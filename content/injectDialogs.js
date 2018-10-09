function injectDialogs() {
  let el = document.createElement('div');
  el.innerHTML = `
  	<dialog-whitelist></dialog-whitelist>
    <dialog-results></dialog-results>
    <dialog-thanks></dialog-thanks>
  `;
  document.body.appendChild(el);
  new Vue({ el, store });
}
