console.log('fsd');

chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
  console.log(request);
  document.querySelector('.tray').innerHTML = request.urls.join(',');
});
