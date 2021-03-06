function Main(){
    this.audio = new Audio();
    this.playQueue = new PlayQueue(
        {
            'audio': this.audio,
            'use_local_storage': false,
            'notify_song_half': true
        }
    );
    this.playQueue.savedSongProperties = [
        'title', 'artist', 'album',
        'artwork', 'url', 'link',
        'timestamp', 'purchaseUrl', 'type',
        'originalType', 'originalSource', 'duration',
        'serviceId', 'postAuthor', 'hasMeta',
        'reblogKey'
    ];
    this.playQueue.smart_previous = false;
    this.progressBar = new ProgressBar(
        {
            'playQueue': this.playQueue,
            'back': '#progress-back',
            'front': '#progress',
            'count': '#time-count',
            'duration': '#time-duration'
        }
    );
    this.cacheElements();
    this.addListeners();
    chrome.runtime.sendMessage(null,
        {
            "type": 'getGA'
        },
        this.gotGA.bind(this)
    );
    this.hasTomahawk = false;
    chrome.runtime.sendMessage(null,
        {
            "type": 'checkTomahawk'
        },
        this.onCheckTomahawk.bind(this)
    )
    chrome.runtime.sendMessage(null,
        {
            "type": 'deepScan'
        }
    )
    chrome.runtime.sendMessage(null,
        {
            "type": 'getDataUrl'
        },
        this.capturedTab.bind(this)
    );
}

// cache elements
Main.prototype.cacheElements = function(){
    this.containerEl = $('#container');
    this.currentSongTitleEl = $('#song-title');
    this.currentArtistEl = $('#artist');
    this.currentAlbumEl = $('#album');
    this.currentLinkEl = $('#link');
    this.rightContainerEl = $('#right');
    this.currentSongArtworkEl = $('#artwork-current');
    this.nextSongArtworkEl = $('#artwork-next');
    this.playlistEl = $('#playlist');

    // service elements
    this.services = $('#services');
    this.serviceIcons = this.services.find('.js-service-icon');
    this.serviceHover = $('#service-hover');
    this.serviceHoverPointer = $('#service-hover-pointer');
    this.serviceHoverContainer = $('#service-hover-container');

    this.serviceStatus = $('#service-status');
    this.serviceStatusMessage = $('#service-status-message');
}

// add listeners
Main.prototype.addListeners = function(){
    this.playQueue.addEventListener(
        "loading",
        this.songLoading.bind(this),
        false
    );
    this.playQueue.addEventListener(
        "playing",
        this.songPlaying.bind(this),
        false
    );
    this.playQueue.addEventListener(
        "songHalf",
        this.onSongHalf.bind(this),
        false
    );
    this.playQueue.addEventListener(
        "play",
        this.toggleControlState.bind(this),
        false
    );
    this.playQueue.addEventListener(
        "pause",
        this.toggleControlState.bind(this),
        false
    );

    $('#minimize').on('click', function(){
        chrome.runtime.sendMessage(null,
            {
                "type": 'toggleMinimize'
            }
        )
    });
    $('#play-pause').on('click', function(){
        this.playQueue.playPause();
        this.ga.event('button', 'click', 'playPause', 1);
    }.bind(this));
    $('#prev').on('click', function(){
        this.playQueue.previous();
        this.ga.event('button', 'click', 'previous', 1);
    }.bind(this));
    $('#next').on('click', function(){
        this.playQueue.next();
        this.ga.event('button', 'click', 'next', 1);
    }.bind(this));

    // playlist click events
    this.playlistEl.on('click', function(e){
        var target = e.target;
        var index = $('.playlist-item').index($(target));
        this.playQueue.play(index);
        this.ga.event('button', 'click', 'playlist item', 1);
    }.bind(this))

    $('.js-service-link').on('click', this.onServiceIconClick.bind(this));

    $(document).on('keyup', this.onKeyup.bind(this));

    // add hover events for service icons
    this.serviceIcons.on('mouseover', this.serviceIconHover.bind(this));
    this.services.on('mouseleave', this.servicesMouseLeave.bind(this));

    // hover events for minimized state
    $('.current-song-info-container').on('mouseover', function(e){
        if($('#container').hasClass('minimized') === true){
            $('.current-song').addClass('hover');
        }
    })
    .on('mouseleave', function(){
        $('.current-song').removeClass('hover');
    });

    $('#options-link').on('click', this.onOptionsClick);
}

Main.prototype.serviceIconHover = function(e){
    var serviceIcon = $(e.target);
    var serviceName = serviceIcon.data('service');
    

    // make current icon active
    this.serviceIcons.removeClass('active');
    serviceIcon.addClass('active');

    // get width of service options if not minimized
    var serviceOptionsEl = $('#service-hover-container').find('.'+serviceName);
    if(this.containerEl.hasClass('minimized') !== true){
        serviceOptionsEl.addClass('layout');
        var width = serviceOptionsEl.outerWidth();
        var hoverContainerCss = {
            'width': width,
            '-webkit-transform': ''
        };

        // position of service pointer (26 is half width of icon);
        var halfIconWidth = 26;
        var left = serviceIcon.position().left + halfIconWidth;

        // adjust width if pointer is too far right or left
        if(left > width/2 + 250 - 5){
            var diff = left - (width/2 + 250 - 5) + 15 >> 0;
            hoverContainerCss['-webkit-transform'] = 'translate('+diff+'px, 5px)';
        }else if(left < 250 - width/2){
            var diff = left - (250 - width/2) - 10 >> 0;
            hoverContainerCss['-webkit-transform'] = 'translate('+diff+'px, 5px)';
        }

        serviceOptionsEl.removeClass('layout');
        this.serviceHoverContainer.css(hoverContainerCss);
    }

    this.serviceHover.attr('class', 'service-hover show '+serviceName);

    // if service links aren't already displayed
    if(this.services.hasClass('open') === false){
        // move pointer to correct position before open
        this.serviceHoverPointer.css('-webkit-transform', 'translate('+left+'px, 5px)');
        this.serviceHoverContainer.one('webkitTransitionEnd', function(){
            this.services.addClass('open');
            this.serviceHoverPointer.css('-webkit-transform', 'translateX('+left+'px)');
        }.bind(this));
    }else{
        this.serviceHoverPointer.css('-webkit-transform', 'translateX('+left+'px)');
    }
}

Main.prototype.servicesMouseLeave = function(e){
    this.serviceHover.removeClass('show');
    this.services.removeClass('open');
    this.serviceIcons.removeClass('active');
    this.serviceHoverContainer.css('-webkit-transform', '');
}

Main.prototype.toggleControlState = function(e) {
    if(e.type === "play"){
        $('#play-pause').removeClass('paused');
    }else {
        $('#play-pause').addClass('paused');
    }
};

// new song loading
Main.prototype.songLoading = function(e){
    this.newSong(e.target.song, e.target.queueNumber);
}

// new song playing
Main.prototype.songPlaying = function(e){
    if(e.target.song.hasMeta === true){
        chrome.runtime.sendMessage(null,
            {
                "type": 'nowPlaying',
                "song": e.target.song
            }
        )
    }
    this.ga.event('song', 'play', e.target.song.type, 1, true);
}

// song half way through
Main.prototype.onSongHalf = function(e){
    if(e.target.song.hasMeta === true){
        chrome.runtime.sendMessage(null,
            {
                "type": 'songHalf',
                "song": e.target.song
            }
        )
    }
}

// new song loading/playing
// update UI
Main.prototype.newSong = function(song, queueNumber){
    if(queueNumber !== this.lastQueueNumber){
        this.updateCurrentSong(song, queueNumber);
        this.updatePlaylistUI(queueNumber);
        this.checkMeta(song, queueNumber);
        this.updateCurrentServiceButtons(song);
        this.lastQueueNumber = queueNumber;
    }
}

// update the current song UI with metadata
Main.prototype.updateCurrentSong = function(song, queueNumber){
    this.currentSongTitleEl.text(song.title || 'Unknown Title');
    this.currentArtistEl.text(song.artist || '');
    this.currentAlbumEl.text(song.album || '');
    this.currentLinkEl
        .text(this.cleanUrl(song.link))
        .attr('href', song.link);

    this.rightContainerEl.removeClass('to-next to-previous');
    if(queueNumber >= this.lastQueueNumber){
        this.rightContainerEl.addClass('to-next');
    }else {
        this.rightContainerEl.addClass('to-previous');
    }
    setTimeout(function(){
        this.updateArtwork(song, queueNumber);
    }.bind(this), 10)

}

// update artwork
Main.prototype.updateArtwork = function(song, queueNumber) {
    var currentArtwork = song.artwork || '',
        prevArtwork = '',
        nextArtwork = '';
    var lastTransitionEl = this.currentSongArtworkEl;
    this.rightContainerEl.removeClass('no-transition');

    // main artwork element
    this.nextSongArtworkEl.css(
            'background-image',
            'url(' + currentArtwork + ')'
        ).removeClass('artwork-next')
        .addClass('artwork-current');
    this.currentSongArtworkEl.addClass('artwork-previous');


    $('#blurred-artwork-next').css(
            'background-image',
            'url(' + currentArtwork + ')'
        )
        .removeClass('artwork-next')
        .addClass('artwork-current');
    $('#blurred-artwork-current').addClass('artwork-previous');

    // next & previous artwork
    var nextSong = this.playQueue.getList()[queueNumber + 1];
    var prevSong = this.playQueue.getList()[queueNumber - 1];

    $('#artworks').removeClass('first-song last-song');
    if(nextSong !== undefined){
        nextArtwork = nextSong.artwork || '';
        $('#next-artwork-current').addClass('artwork-previous');
        $('#next-artwork-next').css(
                'background-image',
                'url(' + nextArtwork + ')'
            )
            .removeClass('artwork-next')
            .addClass('artwork-current');
    }else{
        $('#artworks').addClass('last-song');
    }
    if(prevSong !== undefined){
            if(this.containerEl.hasClass('minimized') !== true){
                lastTransitionEl = $('#prev-artwork-next');
            }
        prevArtwork = prevSong.artwork || '';
        $('#prev-artwork-current').addClass('artwork-previous');
        $('#prev-artwork-next').css(
                'background-image',
                'url(' + prevArtwork + ')'
            )
            .removeClass('artwork-next')
            .addClass('artwork-current');
    }else{
        $('#artworks').addClass('first-song');
    }


    // reset artwork classes when last transition finishes
    lastTransitionEl.one('webkitTransitionEnd', this.resetArtwork.bind(this, currentArtwork, prevArtwork, nextArtwork));

};

// reset artwork elements
Main.prototype.resetArtwork = function(currentArtwork, prevArtwork, nextArtwork){
    this.rightContainerEl.addClass('no-transition');

    // reset main artwork element
    this.currentSongArtworkEl.css(
            'background-image',
            'url(' + currentArtwork + ')'
        );

    if(this.containerEl.hasClass('minimized')){
        $('#blurred-artwork-current').css(
                'background-image',
                'url(' + currentArtwork + ')'
            );
    }

    // reset next artwork element
    $('#next-artwork-current').css(
            'background-image',
            'url(' + nextArtwork + ')'
        );

    // reset previous artwork element
    $('#prev-artwork-current').css(
            'background-image',
            'url(' + prevArtwork + ')'
        )


    setTimeout(function(){
        this.currentSongArtworkEl
            .removeClass('artwork-previous')
            .addClass('artwork-current');
        this.nextSongArtworkEl
            .removeClass('artwork-current')
            .addClass('artwork-next');

        $('#next-artwork-current')
            .removeClass('artwork-previous')
            .addClass('artwork-current');
        $('#next-artwork-next')
            .removeClass('artwork-current')
            .addClass('artwork-next');

        $('#prev-artwork-current')
           .removeClass('artwork-previous')
            .addClass('artwork-current');
        $('#prev-artwork-next')
            .removeClass('artwork-current')
            .addClass('artwork-next');

        if(this.containerEl.hasClass('minimized')){
            $('#blurred-artwork-current')
                .removeClass('artwork-previous')
                .addClass('artwork-current');
            $('#blurred-artwork-next')
                .removeClass('artwork-current')
                .addClass('artwork-next');
        }

    }.bind(this), 10);
}


// update playlist ui
Main.prototype.updatePlaylistUI = function(queueNumber){
    $('.playlist-item').removeClass('selected');
    $('.playlist-item').eq(queueNumber).addClass('selected');
}

// check if song needs metadata
Main.prototype.checkMeta = function(song, queueNumber){
    if(song.hasMeta === false){
        chrome.runtime.sendMessage(null,
            {
                "type": 'getId3',
                "url": song.url
            },
            this.gotId3.bind(this, queueNumber)
        )
    }
}

// update current song service buttons
Main.prototype.updateCurrentServiceButtons = function(song){
    $('.service-icon').removeClass('show selected');
    switch(song.type){
        case 'tumblr':
            $('#service-icon-tumblr').addClass('show');
            if(song.originalType === 'soundcloud'){
                $('#service-icon-soundcloud').addClass('show');
            }
            if(song.originalType === 'bandcamp'){
                $('#service-icon-bandcamp').addClass('show');
            }
        break;
        case 'soundcloud':
            $('#service-icon-soundcloud').addClass('show');
        break;
        case 'bandcamp':
            $('#service-icon-bandcamp').addClass('show');
        break;
        default:
        break;
    }
    if(song.hasMeta === true){
        if(song.title && song.artist){
            $('#service-icon-rhapsody').addClass('show');
            $('#service-icon-rdio').addClass('show');
            $('#service-icon-spotify').addClass('show');
            if(this.hasTomahawk === true){
                $('#service-icon-tomahawk').addClass('show');
            }
        }
    }
}

// got id3 data from file
// Update UI
Main.prototype.gotId3 = function(queueNumber, tags){
    if(tags !== null){
        var song = this.playQueue.getList()[queueNumber];
        song.hasMeta = true;
        if(tags.title){
            this.currentSongTitleEl.text(tags.title);
            $($('.playlist-item-song')[queueNumber]).text(tags.title);
            song.title = tags.title;
        }
        if(tags.artist){
            this.currentArtistEl.text(tags.artist);
            $($('.playlist-item-artist')[queueNumber]).text(tags.artist);
            song.artist = tags.artist;
        }
        if(tags.album){
            this.currentAlbumEl.text(tags.album);
            song.album = tags.album;
        }
        if(tags.title && tags.artist){
            $('#service-icon-rhapsody').addClass('show');
            $('#service-icon-rdio').addClass('show');
            $('#service-icon-spotify').addClass('show');
            if(this.hasTomahawk === true){
                $('#service-icon-tomahawk').addClass('show');
            }
        }
    }
}

// Got the playlist from background
Main.prototype.gotPlaylist = function(list){
    var items = [];
    var playlistItem = document.getElementById('playlist-item-template').content;
    for(var i in list){
        var song = list[i];
        var clone = playlistItem.cloneNode(true);
        clone.querySelector('.playlist-item-song').innerText = song.title || 'Unknow Title';
        clone.querySelector('.playlist-item-artist').innerText = song.artist || '';
        items.push(clone);
    }
    this.playQueue.add(list);
    this.newSong(this.playQueue.getList()[0], 0);
    this.playlistEl.append(items);
}

// Toggle minimize state
Main.prototype.toggleMinimize = function(){
    if(this.containerEl.hasClass('minimized')){
        this.containerEl.removeClass('minimized');
        chrome.runtime.sendMessage(null,
            {
                "type": 'maximizeEnd'
            }
        );
    }
    else{
        this.containerEl.addClass('minimized');
        chrome.runtime.sendMessage(null,
            {
                "type": 'minimizeEnd'
            }
        );
    }
}


Main.prototype.capturedTab = function(dataUrl) {

    var img = new Image();
    $(img).addClass('captured-tab');

    img.onload = function(){
        $('#container').prepend(img);
        setTimeout(function(){
            $('body').addClass('show');
        }, 250);
    }
    img.src = dataUrl;

};

Main.prototype.onServiceIconClick = function(e){
    var service = e.target.parentNode.dataset.service;
    var song = this.playQueue.getSong();
    switch(service){
        case 'tumblr':
            var action = e.target.dataset.action;
            if(action === 'view'){
                window.open(song.link);
            }
            if(action === 'like'){
                this.updateServiceMessage('Liking on Tumblr...');
                chrome.runtime.sendMessage(null,
                    {
                        "type": 'tumblrLike',
                        "id": song.serviceId,
                        "reblogKey": song.reblogKey
                    }
                )
            }
        break;
        case 'soundcloud':
            var action = e.target.dataset.action;
            if(action === 'view'){
                window.open(song.originalSource);
            }
            if(action === 'like'){
                this.updateServiceMessage('Liking on Soundcloud...');
                if(song.type === 'soundcloud'){
                    chrome.runtime.sendMessage(null,
                        {
                            "type": 'soundcloudFavorite',
                            "id": song.serviceId
                        }
                    )
                }
                if(song.type === 'tumblr'){
                    chrome.runtime.sendMessage(null,
                        {
                            "type": 'soundcloudResolveThenFavorite',
                            "url": song.originalSource
                        }
                    )
                }
            }
        break;
        case 'rdio':
            this.updateServiceMessage('Saving on Rdio...');
            chrome.runtime.sendMessage(null,
                {
                    "type": 'rdioSave',
                    "title": song.title,
                    "artist": song.artist
                }
            )
        break;
        case 'spotify':
            this.updateServiceMessage('Opening on Spotify...');
            chrome.runtime.sendMessage(null,
                {
                    "type": 'spotifyOpen',
                    "title": song.title,
                    "artist": song.artist,
                    "album": song.album
                }
            )
        break;
        case 'tomahawk':
            this.updateServiceMessage('Opening on Tomahawk...');
            chrome.runtime.sendMessage(null,
                {
                    "type": 'tomahawkOpen',
                    "title": song.title,
                    "artist": song.artist,
                    "url": song.url,
                    "album": song.album
                }
            )
        break;
        case 'bandcamp':
            var url = song.purchaseUrl;
            if(song.purchaseUrl.indexOf('?') === -1){
                url = song.purchaseUrl + '?from=exfm';
            }
            else{
                url = song.purchaseUrl + '&from=exfm';
            }
            window.open(url);
        break;
        case 'rhapsody':
            this.updateServiceMessage('Saving on Rhapsody...');
            chrome.runtime.sendMessage(null,
                {
                    "type": 'rhapsodySave',
                    "title": song.title,
                    "artist": song.artist
                }
            )
        break;
        default:
        break;
    }
    this.ga.event('button', 'click', service, 1);
}

// keyboard shortcuts
Main.prototype.onKeyup = function(e){
    switch(e.keyCode){
        case 32:
            this.playQueue.playPause();
            this.ga.event('keyboard', 'keyup', 'playPause', 1);
        break;
        case 37:
            this.playQueue.previous();
            this.ga.event('keyboard', 'keyup', 'previous', 1);
        break;
        case 38:
            this.playQueue.previous();
            this.ga.event('keyboard', 'keyup', 'previous', 1);
        break;
        case 39:
            this.playQueue.next();
            this.ga.event('keyboard', 'keyup', 'next', 1);
        break;
        case 40:
            this.playQueue.next();
            this.ga.event('keyboard', 'keyup', 'next', 1);
        break;
        case 77:
            this.toggleMinimize();
            this.ga.event('keyboard', 'keyup', 'toggleMinimize', 1);
        break;
        default:
        break;
    }
}

// Google Analytics
Main.prototype.gotGA = function(obj){
    if(obj !== null){
        this.ga = new ExtGA(
            {
                'trackingId': obj.ACCOUNT,
                'trackingDns': obj.DOMAIN,
                'appVersion': obj.VERSION,
                'appName': obj.NAME
            }
        );
    }
    else{
        this.ga = {
            'event': function(){},
            'pageview': function(){},
            'social': function(){},
            'exception': function(){}
        };
    }
}

// Service action feedback
// eg. after clicking a button
Main.prototype.serviceAction = function(success, message, action, network){
    if(success === true){
        var song = this.playQueue.getSong();
        this.ga.social(action, network, song.type, 1);
        this.updateServiceMessage(message, 'success');
        if(network === 'Spotify' || network === 'Tomahawk'){
            this.playQueue.pause();
        }
    }
    else{
        this.updateServiceMessage(message, 'error');
    }
    setTimeout(
        function(){
            this.serviceStatus.removeClass('success error show');
        }.bind(this),
        3000
    );
}

// Clean url for display
Main.prototype.cleanUrl = function(href){
    var r = href;
    if (href){
        if(href === 'null' || href === 'undefined' || href === 'None'){
            return '';
        }
        if (href.indexOf('http://') !== -1){
            r = href.replace("http://", "");
        }
        if (href.indexOf('https://') !== -1){
            r = href.replace("https://", "");
        }
        var withLastSlash = r;
        var i = r.indexOf("/");
        if (i !== -1 && i !== 0){
            r = r.substr(0, i);

        }
        var www = r.indexOf('www.');
        if (www !== -1 && www === 0){
            r = r.substr(4);
            withLastSlash = withLastSlash.substr(4);
        }
        r = r.replace(".tumblr.com", "");
        r = r.replace("tumblr.com", "");
        if (withLastSlash.indexOf("soundcloud.com") !== -1){
            var scSplits = withLastSlash.split("/");
            return scSplits[0]+"/"+scSplits[1];
        }
        return r;
    } else {
        return '';
    }
};


// check if user has Tomahawk running
Main.prototype.onCheckTomahawk = function(hasTomahawk){
    this.hasTomahawk = hasTomahawk;
}

// clicked on options icon
// open options page
Main.prototype.onOptionsClick = function(){
    var url = chrome.extension.getURL('html/options.html');
    chrome.runtime.sendMessage(null,
        {
            "type": 'openTab',
            "url": url
        }
    )
}

// update service status message
Main.prototype.updateServiceMessage = function(message, className){
    this.serviceStatusMessage.text(message);
    this.serviceStatus
        .removeClass('success error')
        .addClass( 'show ' + className);
}

var main;
$(document).ready(
    function(){
        main = new Main();
    }
)
