function Scan(){
    this.response = {
        "url": location.href,
        "hostname": location.hostname,
        "showPageActionIcon": false,
        "isTumblr": false,
        "isTumblrDashboard": false,
        "isSoundcloud": false,
        "isBandcamp": false,
        "isLiveMusicArchive": false
    }
    this.tumblr();
    this.soundcloud();
    this.bandcamp();
    this.liveMusicArchive();
    chrome.runtime.sendMessage(null, 
        {
            'type': 'scanDone',
            'response': this.response
        }
    )
}

// Are we on a tumblr page?
// 1. Look for .tumblr.com url 
// 2. Look for tumblr.com/dashboard
// 3. Look for 'follow' iframe
Scan.prototype.tumblr = function(){
    if(location.href.indexOf('tumblr.com') !== -1){
        if(location.href.indexOf('tumblr.com/dashboard') !== -1){
            this.response.isTumblrDashboard = true;
            this.response.showPageActionIcon = true;
            return;
        }
        else{
            this.response.isTumblr = true;
            this.response.showPageActionIcon = true;
            return;
        }
    }
    else{
        if(document.getElementById("tumblr_controls") !== null){
            this.response.isTumblr = true;
            this.response.showPageActionIcon = true;
            return;
        }
    }
}

// Are we on a soundcloud page?
// 1. Look for .soundcloud.com url 
Scan.prototype.soundcloud = function(){
    if(location.href.indexOf('soundcloud.com') !== -1){
        this.response.isSoundcloud = true;
        this.response.showPageActionIcon = true;
        return;
    }
}

// Are we on a bandcamp page?
// 1. Look for .bandcamp.com url  
Scan.prototype.bandcamp = function(){
    if(location.href.indexOf('bandcamp.com') !== -1){
        this.response.isBandcamp = true;
        this.response.showPageActionIcon = true;
        return;
    }
}

// Are we on a Live Music Archive page?
// 1. Look for .arhcive.org url  
Scan.prototype.liveMusicArchive = function(){
    if(location.href.indexOf('archive.org') !== -1){
        this.response.isLiveMusicArchive = true;
        this.response.showPageActionIcon = true;
        return;
    }
}

var scan = new Scan();