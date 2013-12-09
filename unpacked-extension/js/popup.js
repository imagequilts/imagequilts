document.addEventListener('DOMContentLoaded', function(){
  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({active: true, windowId: currentWindow.id}, function(activeTabs) {
      chrome.tabs.executeScript(activeTabs[0].id, {file: 'findImages.js', allFrames: true});
    });
  });
});
