chrome.browserAction.onClicked.addListener(function(){
  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({active: true, windowId: currentWindow.id}, function(activeTabs) {
      chrome.tabs.executeScript(activeTabs[0].id, {file: 'js/findImages.js', allFrames: true});
    });
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
  if (!request.urls.length) return;

  chrome.tabs.create({
    'url': chrome.extension.getURL('html/index.html')
  }, function(tab) {
    chrome.tabs.sendRequest(tab.id, request);
  });
});