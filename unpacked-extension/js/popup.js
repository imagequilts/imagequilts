var tray;
console.log(ffff, '43');
document.addEventListener('DOMContentLoaded', function(){
  tray = document.querySelector('.tray');

  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({active: true, windowId: currentWindow.id}, function(activeTabs) {
      chrome.tabs.executeScript(activeTabs[0].id, {file: 'js/findImages.js', allFrames: true});
    });
  });
});

chrome.extension.onRequest.addListener(function(images){
  if (!tray)
    return;

  for (var i=0; i < images.length; i++){
    var img = document.createElement('img');
    img.src = images[i];
    tray.appendChild(img); 
  }
});
