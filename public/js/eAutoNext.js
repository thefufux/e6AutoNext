class eAutoNext {

    /**
     * The root url of e621 (can be e926 or e6ai for exemple)
     */
    #baseUrl;
    #interval;
    #timeout;
    previousPost;
    currentPost;
    nextPost;
    status = "idle";

    onnext = (currentPost) => {};

    constructor(opt) {
        try {
            this.initialize(opt);
        } catch(e) {
            console.error(`Unable to construct eAutoNext instance:`, e);
            throw e;
        }
    }

    initialize(opt) {
        try {
            if(!opt.website) throw 'Please, select a website';
            switch(opt.website) {
                case 'e621':
                    if(!opt.e621Username) throw 'Empty username';
                    if(!opt.e621ApiKey) throw 'Empty api key';
                    this.#baseUrl = 'https://e621.net';
                    this.username = opt.e621Username;
                    this.apiKey = opt.e621ApiKey;
                break;
                case 'e6ai':
                    if(!opt.e6aiUsername) throw 'Empty username';
                    if(!opt.e6aiApiKey) throw 'Empty api key';
                    this.#baseUrl = 'https://e6ai.net';
                    this.username = opt.e6aiUsername;
                    this.apiKey = opt.e6aiApiKey;
                break;
            }
            if(!opt.ratingS && !opt.ratingQ && !opt.ratingE) throw 'Select at least one post rating';
            if(!opt.images && !opt.animated && !opt.videos) throw 'Select at least one post type';
            if(!opt.secBeforeNext) throw 'Seconds before next post is not set';

            this.ratingS =      !!opt.ratingS;
            this.ratingQ =      !!opt.ratingQ;
            this.ratingE =      !!opt.ratingE;
            this.images =       !!opt.images;
            this.animated =     !!opt.animated;
            this.videos =       !!opt.videos;

            this.waitVideoEnd = !!opt.waitVideoEnd;
            this.secBeforeNext = parseInt(opt.secBeforeNext);
            this.muteVideos = !!opt.muteVideos;
            this.showControls = !!opt.showControls;

            this.tags = opt.tags ?? "";
            if(!this.ratingS) this.tags += " -rating:s";
            if(!this.ratingQ) this.tags += " -rating:q";
            if(!this.ratingE) this.tags += " -rating:e";

            if(!this.images) this.tags += " -type:jpg -type:png";
            if(!this.animated) this.tags += " -type:gif";
            if(!this.videos) this.tags += " -type:webm";
            this.tags += " -type:swf";

            if(opt.minScore)
                this.tags += " score:>" + (parseInt(opt.minScore) - 1);
            this.tags = this.tags.trim();
        } catch(e) {
            console.error(`Unable to construct eAutoNext instance:`, e);
            throw e;
        }
    }

    /**
     * Make a request to the e621 api
     * @param {object} data 
     * @param {number} limit Limit the number of posts
     * @param {string|number} page The page number or the above/before of the post id (a12456 | b123456)
     * @param {string} tags The query tags to retrieve
     * @returns {object}
     */
    async request(data = {}) {
        try {
            const queryParams = new URLSearchParams(data).toString();
            let headers = new Headers({
                "Authorization":"Basic " + btoa(`${this.username}:${this.apiKey}`),
                "User-Agent":`${config.appname}/${config.version} (by ${config.author} on e621)`
            });
            console.log("New Request:", this.#baseUrl + "/posts.json?" + queryParams, [...headers]);
            const response = await fetch(this.#baseUrl + "/posts.json?" + queryParams, {
                method: "GET",
                mode: "cors",
                cache: "no-cache",
                headers
            });
            return await response.json();
        } catch(e) {
            console.warn(`Unable to request ${this.#baseUrl}:`, e);
            throw new Error(`An error occured while sending request to ${this.#baseUrl}`);
        }
    }

    async checkCredentials() {
        try {
            await this.request({limit:1});
            return true;
        } catch(e) {
            return false;
        }
    }

    async getNextPost() {
        try {
            const response = await this.request({
                limit:2,
                tags:this.tags,
                page:this.currentPost ? 'b' + this.currentPost.id : 1
            });
            this.previousPost = this.currentPost;
            this.currentPost = response.posts[0];
            this.nextPost = response.posts[1];
            return this.currentPost;
        } catch(e) {
            console.log("Unable to get next post:", e);
            throw e;
        }
    }

    async getPreviousPost() {
        try {
            const response = await this.request({
                limit:2,
                tags:this.tags,
                page:this.currentPost ? 'a' + this.currentPost.id : 1
            });
            this.nextPost = this.currentPost;
            this.previousPost = response.posts[1];
            this.currentPost = response.posts[0];
            return this.currentPost;
        } catch(e) {
            console.log("Unable to get next post:", e);
            throw e;
        }
    }

    async start() {
        try {
            this.status = 'playing';
            const interval = this.secBeforeNext * 1000;
            await this.next();
            this.#interval = setInterval(() => {
                this.next();
            }, interval);
        } catch(e) {
            console.log("Unable to start:",e);
            throw e;
        }
    }

    async pause() {
        this.status = 'paused';
        if(this.#timeout)
            clearTimeout(this.#timeout);
        if(this.#interval)
            clearInterval(this.#interval);
    }

    async stop() {
        this.status = 'idle';
        if(this.#interval) {
            clearInterval(this.#interval);
            console.log("Stopped AutoNext");
        }
    }

    async next() {
        await this.getNextPost();
        this.onnext(this.previousPost, this.currentPost, this.nextPost);
        if(this.currentPost?.file.ext === 'webm' && this.waitVideoEnd) {
            this.pause();
            this.status = "waiting";
        }
    }
}
