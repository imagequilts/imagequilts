(function(){

    var app = {};

    app.images = [];

    app.init = function() {
        app.setupImageListener();
        app.setupDragAndDropListener();
        app.decideToShowLoading();
    };

    app.setupImageListener = function() {
        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
            app.images.unshift.apply(app.images, request.urls);
            app.makeQuilt();
        });
    };

    app.setupDragAndDropListener = function() {
        document.body.ondrop = function(e) {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                var files = e.dataTransfer.files;
                var j = 0;
                for (var i = 0; i < files.length; i++) {
                    var reader = new FileReader();
                    reader.onload = function(e){
                        app.images.unshift(e.target.result);
                        if (j === files.length - 1) {
                            app.makeQuilt();
                        }
                        j += 1;
                    };
                    reader.readAsDataURL(files[i]);
                }
            }
            e.preventDefault();
            return false;
        };

        document.body.ondragleave = function(e) {
            $('body').removeClass('dragenter dragover');
        };

        document.body.ondragenter = function(e) {
            $('body').addClass('dragenter');
            e.dataTransfer.dropEffect = 'move';
            e.preventDefault();
            return false;
        };

        document.body.ondragover = function(e) {
            $('body').addClass('dragover');
            e.dataTransfer.dropEffect = 'move';
            e.preventDefault();
            return false;
        };
    };

    app.makeQuilt = function() {
        // Grab all images
        var $body = $('body'),
            $quiltScrollWrapper = $('<div class="quilt-scroll-wrapper"></div>'),
            $quiltWrapper = $('<div class="quilt-wrapper"></div>'),
            $quilt = $('<div class="quilt" data-grayscale="0" data-invert="0"></div>'),
            $tools = $('<div class="tools"></div>'),
            $imagesContainer = $('<div>'),
            $images,
            i
        ;

        for (i = 0; i < app.images.length; i++) {
            $imagesContainer.append('<img src="' + app.images[i] + '" />');
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
            .append('<span class="label zoom-tool">Zoom&nbsp;(Percent)</span>')
            .append($('<a class="zoom-tool">100</a>'))
            .append($('<input class="zoom-tool" type="range" min="100" max="300" value="100">').change(_.debounce(function(e){ $quilt.find('.image').each(function(){ $(this).find('.zoom input').val(e.target.value); $(this).find('img').css('-webkit-transform', 'scale(' + (e.target.value / 100) + ')'); }); }, 20)))
            .append($('<a class="zoom-tool">300</a>'))

            // Scale
            .append('<span class="label scale-tool">Height&nbsp;(px)</span>')
            .append($('<a class="scale-tool">30</a>').click(function(){ $(this).next().val(30); }))
            .append($('<input class="scale-tool" type="range" min="30" max="300" value="150">').change(_.debounce(function(e){ $quilt.find('.image, .image img').each(function(){ $(this).css('height', e.target.value); }); }, 20)))
            .append($('<a class="scale-tool">300</a>').click(function(){ $(this).prev().val(300); }))

            // Order
            .append('<span class="label order-tool">Order</span>')
            .append($('<a class="order-tool">Original</a>').click(function(){
                $images = $quilt.find('.image').toArray();
                $images.sort(function(a, b){
                    a = parseInt($(a).attr('data-original-order'), 10);
                    b = parseInt($(b).attr('data-original-order'), 10);
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });
                $quilt.html($images);
                app.setupIndividualZooms();
            }))
            .append($('<a class="order-tool">Shuffle</a>').click(function(){
                $images = $quilt.find('.image').toArray();
                $images.sort(function(a, b){
                    a = Math.random();
                    b = Math.random();
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });
                $quilt.html($images);
                app.setupIndividualZooms();
            }))
            // Mode
            .append('<span class="label color-mode-tool">Mode</span>')
            .append($('<a class="color-mode-tool">Color</a>').click(function(){ $quilt.attr('data-grayscale', 0); }))
            .append($('<a class="color-mode-tool">Greyscale</a>').click(function(){ $quilt.attr('data-grayscale', 1); }))
            .append($('<a class="color-mode-tool">Inverted</a>').click(function(){ $quilt.attr('data-invert', parseInt($quilt.attr('data-invert'), 10) === 1 ? 0 : 1); }))

            // Export
            .append($('<a class="export">Download Quilt</a>').click(app.saveExport))
        ;

        $body.append($quiltScrollWrapper);
        $quiltScrollWrapper.append($quiltWrapper);
        $quiltWrapper.append($quilt);
        $quilt.append($images);

        $quilt.find('img').each(function(i){
            $(this).css('cssText', '').wrap('<div class="image" data-zoom="1" data-original-order="' + i + '"></div>');
        });

        $quilt.find('.image')
            .append($('<a class="close" title="Remove image from quilt">&times;</a>'))
            .append('<a class="zoom"></a>')
        ;

        $quilt.on('click', '.close', function(e){
            $(this).parent().remove();
        });

        app.setupIndividualZooms();

        $body.append('<div class="drag-helper"><div class="message">Add images...</div></div>');

        $body.css('visibility', 'visible');
    };

    app.setupIndividualZooms = function() {
        $('.image .zoom').empty().append(
            $('<input type="range" min="100" max="300" value="120">').change(function(e){
                $(e.target).parents('.image').find('img').css('-webkit-transform', 'scale(' + (e.target.value / 100) + ')');
            })
        );
    };

    app.saveExport = function() {
        document.body.classList.add('capturing');

        setTimeout(function(){
            chrome.runtime.sendMessage({type: 'screenshot'});

            setTimeout(function(){
                document.body.classList.remove('capturing');
            }, 0);
        }, 300);
    };

    app.decideToShowLoading = function() {
        setTimeout(function(){
            if (!app.images.length) {
                $('.loading').addClass('show');
            }
        }, 50);
    };

    app.init();

})();