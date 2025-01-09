class eAutoNext {

    #baseUrl = "https://e621.net";
    #interval;
    previousPost;
    currentPost;
    nextPost;

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
            if(!opt.username) throw 'Empty username';
            if(!opt.apiKey) throw 'Empty api key';
            if(!opt.ratingS && !opt.ratingQ && !opt.ratingE) throw 'Select at least one post rating';
            if(!opt.images && !opt.animated && !opt.videos) throw 'Select at least one post type';
            if(!opt.secBeforeNext) throw 'Seconds before next post is not set';

            this.username =     opt.username;
            this.apiKey =       opt.apiKey;

            this.ratingS =      !!opt.ratingS;
            this.ratingQ =      !!opt.ratingQ;
            this.ratingE =      !!opt.ratingE;
            this.images =       !!opt.images;
            this.animated =     !!opt.animated;
            this.videos =       !!opt.videos;

            this.waitVideoEnd = !!opt.waitVideoEnd;
            this.secBeforeNext = parseInt(opt.secBeforeNext);

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
            console.log("New Request:", this.#baseUrl + "/posts.json?" + queryParams);
            const response = await fetch(this.#baseUrl + "/posts.json?" + queryParams, {
                method: "GET",
                mode: "cors",
                cache: "no-cache",
                headers
            });
            return await response.json();
        } catch(e) {
            console.warn(`Unable to request e621.net:`, e);
            throw new Error("An error occured while sending request to e621.net");
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
            const interval = this.secBeforeNext * 1000;
            const onNextPost = async () => {
                await this.getNextPost();
                this.onnext(this.previousPost, this.currentPost, this.nextPost);
                if(this.currentPost?.file.ext === 'webm' && this.waitVideoEnd) {
                    
                }
            }
            onNextPost();
            this.#interval = setInterval(onNextPost, interval);
        } catch(e) {
            console.log("Unable to start:",e);
            throw e;
        }
    }

    async stop() {
        if(this.#interval) {
            clearInterval(this.#interval);
            console.log("Stopped AutoNext");
        }
    }
}