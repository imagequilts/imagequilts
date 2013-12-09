function load(){
  var images = document.querySelectorAll('img');

  var urls = [];
  for(var i=images.length; i--;){
    var image = images[i];
    urls.unshift(image.src);
  }

  chrome.runtime.sendMessage({urls: urls}, function(response){
    console.log('resp');
  });
}

if (document.readyState != 'complete'){
  document.addEventListener('DOMContentLoaded', load);
} else {
  load();
}
