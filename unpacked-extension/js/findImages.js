function load() {
  var images = document.querySelectorAll('img');

  var urls = [];

  for (var i = images.length; i--;) {
    var image = images[i];

    if (image.clientWidth < 40 || image.clientHeight < 40)
      continue;

    urls.unshift(image.src);
  }

  chrome.runtime.sendMessage({ urls: urls });
}

if (document.readyState != 'complete') {
  document.addEventListener('DOMContentLoaded', load);
} else {
  load();
}
