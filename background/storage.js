/**
 * Listen for storage requests and handle a queue in order to avoid race conditions.
 *
 * storageQueue items are in the format { key: newValue },
 * which is identical to the chrome.storage API.
 */
const storageQueue = [];
let isQueueBeingProcessed = false;

function processQueue() {
  if (storageQueue.length < 1) {
    isQueueBeingProcessed = false;
    return;
  }
  const item = storageQueue.shift(); // Extract first element from queue

  console.log(`Processing queue for ${item.info}`);


  chrome.storage.sync.set(item.update, () => {
    if (chrome.runtime.lastError) {
      console.error('(botcheck) Failed to save item in storage queue.');
      console.error(chrome.runtime.lastError);
    } else {
      console.log('(botcheck) Processed storage queue item.');
    }
    processQueue();
  });
}

chrome.runtime.onMessage.addListener((request /* , sender, sendResponse */) => {
  if (request.type !== 'botcheck-queue-storage-update') return;
  console.log(`Received storage request for ${request.info}`);
  storageQueue.push(request);
  if (!isQueueBeingProcessed) {
    isQueueBeingProcessed = true;
    processQueue();
  }
});
