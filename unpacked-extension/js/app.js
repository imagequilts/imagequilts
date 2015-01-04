(function(){

    var app = {};

    app.images = [];

    app.topImages = [];
    app.bottomImages = [];

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

    app.preserveAspectRatioAdjustSize = function($image, obj) {
        obj = obj || {};

        var aspectRatio = parseFloat($image.attr('data-aspect-ratio'));
        var zoom = parseFloat($image.attr('data-zoom'));

        if (aspectRatio && aspectRatio > 0) {
            if (!obj || (!obj.width && !obj.height)) {
                obj.width = $image.width();
            }

            if (obj.width) {
                $image.css({
                    width: obj.width,
                    height: obj.width / aspectRatio
                });

                if (zoom) {
                    $image.find('img').css({
                        width: obj.width * zoom,
                        height: obj.width * zoom / aspectRatio
                    });
                }
            }

            if (obj.height) {
                $image.css({
                    width: aspectRatio * obj.height,
                    height: obj.height
                });

                if (zoom) {
                    $image.find('img').css({
                        width: aspectRatio * obj.height * zoom,
                        height: obj.height * zoom
                    });
                }
            }
        } else {
            console.error('Image missing aspect ratio');
        }
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
            $('.image.dragged-over, .quilt-vertical-rag.dragged-over').removeClass('dragged-over');
            $('.drop-guide').remove();

            if (currentlyDraggingImage) {
                positionDraggingImage(e);

                if (e.toElement && e.toElement.tagName && e.toElement.tagName.toLowerCase() === 'div' && e.toElement.classList.contains('quilt-vertical-rag')) {
                    if (!$(e.toElement).find('.image').length) {
                        $(e.toElement).addClass('dragged-over');
                    } else {
                        $(e.toElement).removeClass('dragged-over');

                        var mouseX = e.clientX + $('.quilt-scroll-wrapper').scrollLeft();
                        var imageCenterX = mouseX + $(currentlyDraggingImage).width() / 2;

                        var $closestImage;
                        var closestImageDistance = 999999;
                        $(e.toElement).find('.image').each(function(){
                            var $image = $(this);

                            if (!$image.hasClass('currently-dragging')) {
                                var bounding = this.getBoundingClientRect();
                                var midway = bounding.left + ((bounding.right - bounding.left) / 2);

                                var distance = Math.abs(midway - imageCenterX);
                                if (distance < closestImageDistance) {
                                    closestImageDistance = distance;
                                    $closestImage = $image;
                                }
                            }
                        });

                        if ($closestImage) {
                            $closestImage.addClass('dragged-over').append('<div class="drop-guide"></div>');
                            determineDraggedOverLeftOrRight($closestImage.find('img').get(0), e);
                        } else {
                            $(e.toElement).addClass('dragged-over');
                        }
                    }
                }

                if (e.toElement && e.toElement.tagName && e.toElement.tagName.toLowerCase() === 'img' && e.toElement !== currentlyDraggingImage) {
                    $(e.toElement).parents('.image').addClass('dragged-over').append('<div class="drop-guide"></div>');
                    determineDraggedOverLeftOrRight(e.toElement, e);
                }
            }
        };

        var dropImage = function() {
            $('.drop-guide').remove();
            var $image = $(currentlyDraggingImage).parents('.image');
            $image.removeClass('currently-dragging').css({ top: 0, left: 0 });
            if ($image.parents('.quilt-core').length && $image.parents('.quilt-core').find('.image').length > 1) {
                app.preserveAspectRatioAdjustSize($image, { height: parseInt($('input.scale-tool').val(), 10) });
            }
            $('body').removeClass('dragging-image');
            currentlyDraggingImage = undefined;
            app.setupIndividualVerticalRagScales();
        };

        document.body.onmouseup = function(e) {
            $('body').removeClass('dragenter dragover');

            var $draggedOverVerticalRag = $('.quilt-vertical-rag.dragged-over');

            if ($draggedOverVerticalRag.length && !$draggedOverVerticalRag.find('.image').length) {
                $draggedOverVerticalRag.removeClass('dragged-over');
                $draggedOverVerticalRag.append($(currentlyDraggingImage).parents('.image'));

                dropImage();
                return;
            }

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
            $quiltTop = $('<div class="quilt-vertical-rag quilt-top"></div>'),
            $quiltCore = $('<div class="quilt-core"></div>'),
            $quiltBottom = $('<div class="quilt-vertical-rag quilt-bottom"></div>'),
            $tools = $('<div class="tools"></div>'),
            $documentationBox = $('<textarea autocomplete="false" spellcheck="false" placeholder="Add documentation... (title, description, date, copyright)" class="documentation-box"></textarea>'),
            $temp = $('<div></div>'),
            $images,
            $topImages,
            $bottomImages,
            i
        ;

        $temp.empty();
        for (i = 0; i < app.images.length; i++) {
            $temp.append('<img draggable="false" data-id="' + app.images[i].id + '" src="' + app.images[i].url + '" />');
        }
        $images = $temp.find('img');

        $temp.empty();
        for (i = 0; i < app.topImages.length; i++) {
            $temp.append('<img draggable="false" data-id="' + app.topImages[i].id + '" src="' + app.topImages[i].url + '" />');
        }
        $topImages = $temp.find('img');

        $temp.empty();
        for (i = 0; i < app.bottomImages.length; i++) {
            $temp.append('<img draggable="false" data-id="' + app.bottomImages[i].id + '" src="' + app.bottomImages[i].url + '" />');
        }
        $bottomImages = $temp.find('img');

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
            .append($('<input class="zoom-tool" type="range" min="100" max="300" value="100">').on('change input', function(e){ $quiltCore.find('.image').each(function(){ $(this).find('.zoom input').val(e.target.value); $(this).attr('data-zoom', e.target.value / 100); app.preserveAspectRatioAdjustSize($(this)); }); }))
            .append($('<a class="zoom-tool">300</a>').click(function(){ $(this).prev().val(300).change(); }))

            // Scale
            .append('<span class="label scale-tool">Row&nbsp;height&nbsp;in&nbsp;pixels</span>')
            .append($('<a class="scale-tool">30</a>').click(function(){ $(this).next().val(30).change(); }))
            .append($('<input class="scale-tool" type="range" min="30" max="300" value="150">').on('change input', function(e){ $quiltCore.find('.image').each(function(){ app.preserveAspectRatioAdjustSize($(this), { height: e.target.value }); }); }))
            .append($('<a class="scale-tool">300</a>').click(function(){ $(this).prev().val(300).change(); }))

            // Order
            .append('<span class="label order-tool">Order</span>')
            .append($('<a class="order-tool">Original</a>').click(function(){
                var $images = $quiltCore.find('.image').toArray();
                $images.sort(function(a, b){
                    a = parseInt($(a).attr('data-id'), 10);
                    b = parseInt($(b).attr('data-id'), 10);
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });
                $quiltCore.html($images);
                app.setupIndividualZooms();
            }))
            .append($('<a class="order-tool">Shuffle</a>').click(function(){
                var $images = $quiltCore.find('.image').toArray();
                $images.sort(function(a, b){
                    a = Math.random();
                    b = Math.random();
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });
                $quiltCore.html($images);
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

        $quilt.append($quiltTop);
        $quiltTop.append($topImages);

        $quilt.append($quiltCore);
        $quiltCore.append($images);

        $quilt.append($quiltBottom);
        $quiltBottom.append($bottomImages);

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

        $quilt.find('img').each(function(){
            this.onload = function() {
                var aspectRatio = this.width / this.height;
                $(this).attr('data-aspect-ratio', aspectRatio);
                $(this).css('width', 150 * aspectRatio);
                $(this).css('height', 150);
                $(this).parents('.image').css('width', 150 * aspectRatio);
                $(this).parents('.image').css('height', 150);
                $(this).parents('.image').attr('data-aspect-ratio', aspectRatio).addClass('aspect-ratio-locked');
            };
        });

        app.setupIndividualZooms();
        app.setupIndividualVerticalRagScales();

        $body.append('<div class="drag-helper"><div class="message">Add images...</div></div>');

        $quiltWrapper.append($documentationBox);

        $body.css('visibility', 'visible');
    };

    app.setupIndividualZooms = function() {
        $('.image .zoom').empty().append(
            $('<input type="range" min="100" max="300" value="120">').on('change input', function(e){
                var $image = $(e.target).parents('.image');
                $image.attr('data-zoom', e.target.value / 100);
                app.preserveAspectRatioAdjustSize($image);
            })
        );
    };

    app.setupIndividualVerticalRagScales = function() {
        $('.quilt-vertical-rag .image').each(function(){
            var $image = $(this);
            $image.resizable({
                aspectRatio: $image.width() / $image.height(),
                handles: 'ne, sw, se',
                maxHeight: 300,
                resize: function() {
                    app.preserveAspectRatioAdjustSize($image);
                }
            });
        });
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