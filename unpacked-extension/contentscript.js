var scripts = ['script'], i;

// Only run on Google Image search
if (/tbm\=isch/.test(location.href)) {
    scripts.forEach(function(name){
        var s = document.createElement('script');
        s.src = chrome.extension.getURL(name + '.js');
        (document.head||document.documentElement).appendChild(s);
        s.onload = function() {
            s.parentNode.removeChild(s);
        };
    });
}