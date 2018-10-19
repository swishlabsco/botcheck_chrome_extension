
let runID = Math.random();

const log = function(...args) {
    console.log('BotCheck', runID, ...args);
}

// Dont run inside iframes
if (window.top === window) {
    log("injection script on", document.location.href);
    
    document.addEventListener("DOMContentLoaded", function(event) {
      safari.extension.dispatchMessage("Hello World!");
    });
}
else {
    log('skipped because not top frame')
}

