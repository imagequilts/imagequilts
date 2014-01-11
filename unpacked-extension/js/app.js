(function(){

    var app = {};

    app.images = [];

    app.makeQuilt = function() {
        // Grab all images
        var $body = $('body'),
            $quiltWrapper = $('<div class="quilt-wrapper"></div>'),
            $quilt = $('<div class="quilt" data-grayscale="0" data-invert="0" data-zoom="0.75"></div>'),
            $tools = $('<div class="tools"></div>'),
            $imagesContainer = $('<div>'),
            $images,
            i
        ;

        for (i = 0; i < app.images.length; i++) {
            $imagesContainer.append('<img class="image" src="' + app.images[i] + '" />');
        }

        $images = $imagesContainer.find('img');

        $body[0].className = '';
        $body.empty().css('visibility', 'hidden').addClass('chrome-image-quilts');
        $body.append('<div style="-webkit-transform: translateZ(0)"></div>');

        $body.append($tools);

        $tools
            // Logo
            .append(
                $('<span class="logo">ImageQuilts</span>')
            )

            // Zoom
            .append('<span class="label">Zoom&nbsp;(Percent)</span>')
            .append($('<a>100</a>').click(function(){ $quilt.find('.image').each(function(){ $(this).attr('data-zoom', 0); }); }))
            .append($('<a>110</a>').click(function(){ $quilt.find('.image').each(function(){ $(this).attr('data-zoom', 1); }); }))
            .append($('<a>125</a>').click(function(){ $quilt.find('.image').each(function(){ $(this).attr('data-zoom', 2); }); }))
            .append($('<a>150</a>').click(function(){ $quilt.find('.image').each(function(){ $(this).attr('data-zoom', 3); }); }))
            .append($('<a>200</a>').click(function(){ $quilt.find('.image').each(function(){ $(this).attr('data-zoom', 4); }); }))
            .append($('<a>300</a>').click(function(){ $quilt.find('.image').each(function(){ $(this).attr('data-zoom', 5); }); }))

            // Scale
            .append('<span class="label">Size&nbsp;(Percent)</span>')
            .append($('<a>50</a>').click(function(){ $quilt.attr('data-zoom', '0.50'); }))
            .append($('<a>67</a>').click(function(){ $quilt.attr('data-zoom', '0.67'); }))
            .append($('<a>75</a>').click(function(){ $quilt.attr('data-zoom', '0.75'); }))
            .append($('<a>90</a>').click(function(){ $quilt.attr('data-zoom', '0.90'); }))
            .append($('<a>100</a>').click(function(){ $quilt.attr('data-zoom', '1.00'); }))
            .append($('<a>110</a>').click(function(){ $quilt.attr('data-zoom', '1.10'); }))
            .append($('<a>125</a>').click(function(){ $quilt.attr('data-zoom', '1.25'); }))

            // Order
            .append('<span class="label">Order</span>')
            .append($('<a>Original</a>').click(function(){
                $images = $quilt.find('.image').toArray();
                $images.sort(function(a, b){
                    a = parseInt($(a).attr('data-original-order'), 10);
                    b = parseInt($(b).attr('data-original-order'), 10);
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });
                $quilt.html($images);
            }))
            .append($('<a>Shuffle</a>').click(function(){
                $images = $quilt.find('.image').toArray();
                $images.sort(function(a, b){
                    a = Math.random();
                    b = Math.random();
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });
                $quilt.html($images);
            }))
            // Mode
            .append('<span class="label">Mode</span>')
            .append($('<a>Color</a>').click(function(){ $quilt.attr('data-grayscale', 0); }))
            .append($('<a>Greyscale</a>').click(function(){ $quilt.attr('data-grayscale', 1); }))
            .append($('<a>Inverted</a>').click(function(){ $quilt.attr('data-invert', parseInt($quilt.attr('data-invert'), 10) === 1 ? 0 : 1); }))

            // Export
            .append($('<a class="right">Export</a>').click(saveExport))

        ;

        $body.append($quiltWrapper);
        $quiltWrapper.append($quilt);
        $quilt.append($images);

        $quilt.find('img').each(function(i){
            $(this).css('cssText', '').wrap('<div class="image" data-zoom="1" data-original-order="' + i + '"></div>');
        });

        $quilt.find('.image')
            .append($('<a class="close" title="Remove image from quilt">&times;</a>'))
            .append($('<a class="zoom" title="Change image zoom and cropping"></a>'))
        ;

        $quilt.on('click', '.close', function(e){
            $(this).parent().remove();
        });

        $quilt.on('click', '.zoom', function(e){
            var $image = $(this).parent();
            $image.attr('data-zoom', (parseInt($image.attr('data-zoom'), 10) + 1) % 6);
        });

        $body.css('visibility', 'visible');
    };

    chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        app.images.unshift.apply(app.images, request.urls);
        app.makeQuilt();
    });

    function saveExport() {
        document.body.classList.add('capturing');

        setTimeout(function(){
            chrome.runtime.sendMessage({type: 'screenshot'});

            setTimeout(function(){
                document.body.classList.remove('capturing');
            }, 0);
        }, 300);
    }

})();
