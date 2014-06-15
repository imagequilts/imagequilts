(function(){

    var app = {};

    app.images = [];

    app.uniqueImageID = 1;

    app.init = function() {
        app.setupImageListener();
        app.setupDragAndDropListener();
        app.decideToShowLoading();
    };

    app.setupImageListener = function() {
        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
            app.addImages(request.urls);
            app.makeQuilt();
        });
    };

    app.addImages = function(urlArray) {
        for (var i = 0; i < urlArray.length; i++) {
            app.addImage(urlArray[i]);
        }
    };

    app.addImage = function(url) {
        app.images.push({
            url: url,
            id: app.uniqueImageID
        });

        app.uniqueImageID += 1;
    };

    app.removeImage = function(id) {
        app.images = _.without(app.images, _.findWhere(app.images, { id: id }));
        $('.image[data-id="' + id + '"]').remove();
    };

    app.setupDragAndDropListener = function() {
        document.body.ondrop = function(e) {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                var files = e.dataTransfer.files;
                var j = 0;
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    if (!file.type || !file.type.split('\/').length || file.type.split('\/')[0].toLowerCase() !== 'image') {
                        if (j === files.length - 1) {
                            app.makeQuilt();
                        }
                        j += 1;
                    } else {
                        var reader = new FileReader();
                        reader.onload = function(e){
                            app.addImage(e.target.result);
                            if (j === files.length - 1) {
                                app.makeQuilt();
                            }
                            j += 1;
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
            e.preventDefault();
            return false;
        };

        var currentlyDraggingImage;

        var positionDraggingImage = function(e) {
            var mouseX = e.clientX + $('.quilt-scroll-wrapper').scrollLeft();
            var mouseY = e.clientY + $('.quilt-scroll-wrapper').scrollTop();
            $(currentlyDraggingImage).parents('.image').css({
                left: (mouseX + 10) + 'px',
                top: (mouseY + 10) + 'px'
            });
        };

        document.body.onmousedown = function(e) {
            if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
                currentlyDraggingImage = e.target;
                $(currentlyDraggingImage).parents('.image').addClass('currently-dragging');
                positionDraggingImage(e);
                $('body').addClass('dragging-image');
            }
        };

        var determineDraggedOverLeftOrRight = function(element, e) {
            var mouseX = e.clientX + $('.quilt-scroll-wrapper').scrollLeft();
            var bounding = element.getBoundingClientRect();
            var midway = bounding.left + ((bounding.right - bounding.left) / 2);
            if (midway > mouseX) {
                $(element).parents('.image').attr('dragged-over-side', 'left');
            } else {
                $(element).parents('.image').attr('dragged-over-side', 'right');
            }
        };

        document.body.onmousemove = function(e) {
            $('.image.dragged-over').removeClass('dragged-over');
            $('.drop-guide').remove();

            if (currentlyDraggingImage) {
                positionDraggingImage(e);

                if (e.toElement && e.toElement.tagName && e.toElement.tagName.toLowerCase() === 'img' && e.toElement !== currentlyDraggingImage) {
                    $(e.toElement).parents('.image').addClass('dragged-over').append('<div class="drop-guide"></div>');
                    determineDraggedOverLeftOrRight(e.toElement, e);
                }
            }
        };

        var dropImage = function() {
            $('.drop-guide').remove();
            $(currentlyDraggingImage).parents('.image').removeClass('currently-dragging').css({ top: 0, left: 0 });
            $('body').removeClass('dragging-image');
            currentlyDraggingImage = undefined;
        };

        document.body.onmouseup = function(e) {
            $('body').removeClass('dragenter dragover');

            var $draggedOver = $('.image.dragged-over');

            if ($draggedOver.length) {
                var method = 'before';
                if ($draggedOver.attr('dragged-over-side') === 'right') {
                    method = 'after';
                }
                $('.image.dragged-over').removeClass('dragged-over')[method]($(currentlyDraggingImage).parents('.image'));
            }

            dropImage();
        };

        window.onmouseout = function(e) {
            if (e.toElement && e.toElement.tagName && e.toElement.tagName.toLowerCase() === 'html') {
                dropImage();
            }
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
        if (!app.images.length) {
            $('body').removeClass('dragenter dragover');
            $('.update-outer').removeClass('show');
            return;
        }

        var $body = $('body'),
            $quiltScrollWrapper = $('<div class="quilt-scroll-wrapper"></div>'),
            $quiltWrapper = $('<div class="quilt-wrapper"></div>'),
            $quilt = $('<div class="quilt" data-grayscale="0" data-invert="0" alignment="central-axis"></div>'),
            $tools = $('<div class="tools"></div>'),
            $imagesContainer = $('<div>'),
            $images,
            i
        ;

        for (i = 0; i < app.images.length; i++) {
            $imagesContainer.append('<img draggable="false" data-id="' + app.images[i].id + '" src="' + app.images[i].url + '" />');
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

            // Alignment
            .append($('<a class="flush-left"><i>&nbsp;<b></b><b></b><b></b><b></b></i></a>').click(function(){ $quilt.attr('alignment', 'flush-left'); }))
            .append($('<a class="central-axis"><i>&nbsp;<b></b><b></b><b></b><b></b></i></a>').click(function(){ $quilt.attr('alignment', 'central-axis'); }))

            // Zoom
            .append('<span class="label zoom-tool">Zoom&nbsp;percent</span>')
            .append($('<a class="zoom-tool">100</a>').click(function(){ $(this).next().val(100).change(); }))
            .append($('<input class="zoom-tool" type="range" min="100" max="300" value="100">').change(function(e){ $quilt.find('.image').each(function(){ $(this).find('.zoom input').val(e.target.value); $(this).find('img').css('-webkit-transform', 'scale(' + (e.target.value / 100) + ') translateZ(0)'); }); }))
            .append($('<a class="zoom-tool">300</a>').click(function(){ $(this).prev().val(300).change(); }))

            // Scale
            .append('<span class="label scale-tool">Row&nbsp;height&nbsp;in&nbsp;pixels</span>')
            .append($('<a class="scale-tool">30</a>').click(function(){ $(this).next().val(30).change(); }))
            .append($('<input class="scale-tool" type="range" min="30" max="300" value="150">').change(function(e){ $quilt.find('.image, .image img').each(function(){ $(this).css('height', e.target.value); }); }))
            .append($('<a class="scale-tool">300</a>').click(function(){ $(this).prev().val(300).change(); }))

            // Order
            .append('<span class="label order-tool">Order</span>')
            .append($('<a class="order-tool">Original</a>').click(function(){
                $images = $quilt.find('.image').toArray();
                $images.sort(function(a, b){
                    a = parseInt($(a).attr('data-id'), 10);
                    b = parseInt($(b).attr('data-id'), 10);
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
            var $img = $(this);
            $img.wrap('<div class="image" data-zoom="1" data-id="' + $img.attr('data-id') + '"></div>');
        });

        $quilt.find('.image')
            .append($('<a class="close" title="Remove image from quilt">&times;</a>'))
            .append('<a class="zoom"></a>')
        ;

        $quilt.on('click', '.close', function(e){
            app.removeImage(parseInt($(this).parent().attr('data-id'), 10));
        });

        app.setupIndividualZooms();

        $body.append('<div class="drag-helper"><div class="message">Add images...</div></div>');

        $body.css('visibility', 'visible');
    };

    app.setupIndividualZooms = function() {
        $('.image .zoom').empty().append(
            $('<input type="range" min="100" max="300" value="120">').change(function(e){
                $(e.target).parents('.image').find('img').css('-webkit-transform', 'scale(' + (e.target.value / 100) + ') translateZ(0)');
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
                $('.update-outer').addClass('show');
            }
        }, 50);
    };

    app.init();

})();