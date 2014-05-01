/**
 * layout.js - Core layout logic for the responsive ajax view. Provides an
 * implementation of a Justified Grid layout. Essentially:
 *   1) Take a set of images with a height that is at least some set max height.
 *   2) Calculate the scale factor ratio needed to bring each image down to the
 *      max height, and calculate the scaled widths of each image.
 *   3) Determine the images that can fit in the specified div's width, while
 *      tracking the accumulated width, then calculate the ratio of the actual
 *      div width compared to the available/max div width.
 *   4) Use the ratio from 3 to resize the row and images to fill the
 *      entire row.
 *
 * @TODO: Refetch higher res images when viewport is scaled up.
 *
 * Usage: var view = new AnselLayout({ container: 'myContainer' });
 *
 * Required Options:
 *     - container:     The container element id. Contains the following DOM
 *                      structure:
 *        <div>
 *          <div class="anselRow"></div>
 *        </div>
 *
 * Optional Options:
 *     - sizer:         The DOM id of an element to get the row width from.
 *                      Defaults to 'anselSizer'.
 *     - rowSelector:   CSS selector for individual rows  Defaults to ".anselRow"
 *     - maxHeight:     The maximum height, in pixels, to allow for thumbnails.
 *                      Defaults to 300.
 *     - border:        Size, in pixels of the TOTAL spacing between images.
 *                      Defaults to 8.
 *     - padding:       Size, in pixels of the existing padding to account for
 *                      in the container element. Defaults to 12.
 *     - galleryWidth:  The width, in pixes, of gallery thumbnails.
 *                      Defaults to 300.
 *
 * Custom Events:  Fired on the opts.container element passed into the
 *                 constructor.
 *
 *     - AnselLayout:scroll  Fired when the container is scrolled enough to
 *                           trigger new content (i.e., the next page) to be
 *                           lazy loaded. An object like
 *                           { images: x, galleries: y} is available in the
 *                           memo property of the Event object, where x is
 *                           the current length of the images array and y is
 *                           the current size of the galleries hash.
 *
 *
 * Copyright 2014 Horde LLC (http://www.horde.org/)
 *
 * See the enclosed file COPYING for license information (GPL). If you
 * did not receive this file, see http://www.horde.org/licenses/gpl.
 *
 * @author Michael J Rubinsky <mrubinsk@horde.org>
 */
AnselLayout = Class.create({

    opts: {},

    // An array of image objects to be displayed.
    // [{id: xx, width_s: xx, height_s: xx }]
    images: [],

    // An array of galleries to display.
    galleries: [],

    // Used internally to calculate viewport size changes.
    lastWidth: 0,

    initialize: function(opts)
    {
        this.opts = Object.extend({
            sizer: 'anselSizer',
            rowSelector: '.anselRow',
            maxHeight: 300,
            border: 8,
            padding: 12,
            galleryWidth: 300
        }, opts);

        // Container is the image row container.
        this.opts.container = $(opts.container).down();
        this.opts.parent = $(opts.container);

        Element.observe(window, 'resize', this.onResize.bindAsEventListener(this));
        this.opts.parent.observe('scroll', this.onScroll.bindAsEventListener(this));
    },

    reset: function()
    {
        $(this.opts.container).select(this.opts.rowSelector).each(function(r) {
            r.update();
        }.bind(this));
    },

    resize: function()
    {
        this.lastWidth = $(this.opts.sizer).getWidth();
        $(this.opts.container).select(this.opts.rowSelector).each(function(r) {
            r.width = this.lastWidth;
        }.bind(this));
        this.process();
    },

    process: function()
    {
        var rows = $(this.opts.container).select(this.opts.rowSelector),
            rowWidth = $(this.opts.sizer).getLayout().get('padding-box-width'), scaledWidths = [],
            baseLine = 0, imgBaseLine = 0, rowNum = 0, newRow;

        if (!this.images.length && !this.galleries.size()) {
            return;
        }

        if (!rows.length) {
            newRow = new Element('div', { class: 'anselRow' });
            $(this.opts.container).insert(newRow);
            rows.push(newRow);
        }

        // Gallery key images are always the same size, make sure
        // we account for any we want to display.
        this.galleries.each(function(pair) {
            scaledWidths.push(this.opts.galleryWidth);
        }.bind(this));

        // Calculate scaled image heights
        // @TODO, request newly sized images for certain size thresholds.
        this.images.each(function(im) {
            var wt = parseInt(im.width_s, 10),
                ht = parseInt(im.height_s, 10);
            if (ht != this.opts.maxHeight) {
                wt = Math.floor(wt *  (this.opts.maxHeight / ht));
            }
            scaledWidths.push(wt);
        }.bind(this));

        while (rowNum++ < rows.length) {
            // imgCntRow =   Number of images in this row.
            // totalCntRow = Number of tiles in the current row.
            // imgNumber =   The current image we are handling for the current
            //               row.
            // totalNumber = The current tile (image OR gallery) we are handling
            //               for the current row.
            // totalWidth =  The total width of the current row.
            // ratio =       The scale ratio.
            // newht =       The new height of the scaled row.
            var d_row = rows[rowNum - 1], imgCntRow = 0, totalCntRow = 0,
                imgNumber = 0, totalWidth = 0, totalNumber = 0, ratio, newht;

            d_row.update();

            // Calculate width of images and the number of images to view in
            // this row.
            while (totalWidth < rowWidth) {
                if (baseLine + totalCntRow >= scaledWidths.length) {
                    break;
                }
                totalWidth += scaledWidths[baseLine + totalCntRow++];
            }

            // Ratio of actual width of row to total width of images to be used.
            // This looks more complicated than it is. We add in the border
            // value, but since the border value is constant (i.e., not scaled
            // up or down onResize) we must adjust it up by the ratio so that
            // when it's reduced by the ratio later, it is reduced back to
            // the proper value.
            ratio = rowWidth / (totalWidth + ((this.opts.border * totalCntRow) / (rowWidth / totalWidth)));

            // Reset, this will hold the totalWidth of the processed images.
            totalWidth = 0;

            // new height
            newht = Math.floor(this.opts.maxHeight * ratio);

            // Fill the row with the images we know can fit. Start with any
            // gallery tiles we decided to show.
            while (totalNumber < totalCntRow && (totalNumber + baseLine) < this.galleries.size()) {
                var keyImage = this.galleries.get(totalNumber + 1).ki,
                    newwt = Math.floor(scaledWidths[baseLine + totalNumber] * ratio);

                totalWidth += newwt;
                // Create and insert image into current row.
                (function() {
                    var wrap = new Element('span', {
                        class: 'ansel-photo-wrap'
                    });

                    var img = new Element('img', {
                        class: 'ansel-photo',
                        src: keyImage,
                        width: newwt,
                        height: newht
                    });

                    // When ratio >= 1, we didn't have enough images to finish
                    // out the row. Set the height to the maximum we can and
                    // let the browser do the width scale.
                    if (ratio >= 1) {
                        img.style.width = 'auto';
                        img.style.height = Math.min(this.opts.maxHeight, Ansel.conf.style['gallery-width']) + 'px';
                    }
                    d_row.insert(wrap.update(img));
                }.bind(this))();
                totalNumber++;
            }

            // Move on to images?
            while (totalNumber < totalCntRow && (imgNumber + imgBaseLine) <= this.images.length) {
                var photo = this.images[imgBaseLine + imgNumber],
                    newwt = Math.floor(scaledWidths[baseLine + totalNumber] * ratio);

                // Add border, and new image width to accumulated width.
                totalWidth += newwt;

                // Create and insert image into current row.
                (function() {
                    var wrap = new Element('span', {
                        class: 'ansel-photo-wrap'
                    });
                    var img = new Element('img', {
                        class: 'ansel-photo',
                        src: photo.screen,
                        width: newwt,
                        height: newht
                    });

                    // When ratio >= 1, we didn't have enough images to finish
                    // out the row. Set the height to the maximum we can and
                    // let the browser do the width scale.
                    if (ratio >= 1) {
                        img.style.width = 'auto';
                        img.style.height = Math.min(this.opts.maxHeight, photo.height_s) + 'px';
                    }
                    d_row.insert(wrap.update(img));
                }.bind(this))();
                imgNumber++;
                totalNumber++;
                imgCntRow++;
            }

            // Fine tune the totalWidth if it is slightly smaller than rowWidth.
            // Add 1px to each image until we have enough width.
            totalNumber = 0;
            while (totalWidth < rowWidth) {
                var imgs = d_row.select('img:nth-child(' + (totalNumber + 1) + ')');
                if (!imgs[0]) {
                    break;
                }
                imgs[0].setStyle({ width: imgs[0].getWidth() + 1 });
                totalNumber = (totalNumber + 1) % totalCntRow;
                totalWidth++;
            }

            // Fine tune the totalWidth if it is slightly larger than rowWidth.
            // Subtract 1px to each image until we have enough width.
            totalNumber = 0;
            while (totalWidth > rowWidth) {
                var imgs = d_row.select('img:nth-child(' + (totalNumber + 1) + ')');
                if (!imgs[0]) {
                    break;
                }
                imgs[0].setStyle({ width: imgs[0].getWidth() - 1 });
                totalNumber = (totalNumber + 1) % totalCntRow;
                totalWidth--;
            }
            baseLine += totalCntRow;
            imgBaseLine += imgCntRow;

            // Add a new, empty row if we still have images.
            if (rowNum == rows.length && baseLine < (this.images.length + this.galleries.size())) {
                newRow = d_row.clone();
                $(this.opts.container).insert(newRow.update());
                rows.push(newRow);
            }
        }
    },

    // Handlers
    // Trigger a resize when the screen changes by 10%
    onResize: function()
    {
        this.resize();
    },

    onScroll: function(e)
    {
        var el = e.element();
        if (el.scrollTop >= (el.scrollHeight - (el.clientHeight + 200))) {
            $(this.opts.container).fire('AnselLayout:scroll', { image: this.images.length, gallery: this.galleries.size() });
        }
    }

});