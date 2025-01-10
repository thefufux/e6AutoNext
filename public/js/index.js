(async () => {
    const req = await fetch('/config');
    globalThis.config = await req.json();
    
    window.onresize = () => {
        if(ean) resizePreview();
    };

    document.querySelector("button.hideOptions").addEventListener("click", function() {
        const target = document.querySelector(".autoNextOptions");
        target.style.width = 0;
    });

    document.querySelector("select#website").addEventListener('change', function() {
        const options = document.querySelector(`.autoNextOptions`);
        switch(this.value) {
            case 'e6ai':
                options.querySelector('.e621Cred').style.display = 'none';
                options.querySelector('.e6aiCred').style.display = '';
                options.querySelectorAll('.e621Cred input').forEach(el => el.required = false);
                options.querySelectorAll('.e6aiCred input').forEach(el => el.required = true);
            break;
            case 'e621':
            default:
                options.querySelector('.e621Cred').style.display = '';
                options.querySelector('.e6aiCred').style.display = 'none';
                options.querySelectorAll('.e621Cred input').forEach(el => el.required = true);
                options.querySelectorAll('.e6aiCred input').forEach(el => el.required = false);
            break;
        }
    });

    document.querySelector(".autoNextForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const errors = document.querySelector(".errors");
        errors.innerHTML = "";
        try {
            const formData = new FormData(this);
            const formEntries = Object.fromEntries(formData.entries());
            if(window.ean) {
                ean.stop();
                ean.initialize(formEntries);
            } else {
                window.ean = new eAutoNext(formEntries);
            }
            const credOk = await ean.checkCredentials();

            document.querySelector(".errors").innerText = "";

            localStorage.eAutoNext = JSON.stringify(formEntries);

            if(!credOk) {
                delete ean;
                errors.innerText = "Invalid Credentials";
            } else startAutoNext();
        } catch(e) {
            console.error(e);
            errors.innerText = e;
        }
    });

    document.querySelector("input.pauseAutoNext").addEventListener("click", function(e) {
        if(!ean) return;
        switch(ean.status) {
            case 'paused':
                ean.start();
            break;
            case 'playing':
            case 'waiting':
                ean.pause();
            break;
        }
    });

    if(localStorage.eAutoNext) {
        const options = document.querySelector(`.autoNextOptions`);
        options.querySelectorAll(`input[type=checkbox]`).forEach(el => el.checked = false);
        const data = JSON.parse(localStorage.eAutoNext);
        for(let [key, value] of Object.entries(data)) {
            const input = options.querySelector(`[name=${key}]`);
            if(!input) continue;
            switch(input.type) {
                case 'checkbox':
                    input.checked = true;
                break;
                default:
                    input.value = value;
                break;
            }
        }
        options.querySelector('select#website').dispatchEvent(
            new InputEvent('change', {
                bubbles: true,
                cancelable: true
            })
        );
    }
})();

function startAutoNext() {
    ean.onnext = refreshPostPreview;
    ean.start();
}

function refreshPostPreview() {
    const previousPost = ean.previousPost;
    const currentPost = ean.currentPost;
    const nextPost = ean.nextPost;

    const controlsContainer = document.querySelector(".autoNextCurrentPostFooter ");
    controlsContainer.querySelector("input.previousPost").disabled = previousPost ? false : true;
    controlsContainer.querySelector("input.nextPost").disabled = nextPost ? false : true;
    controlsContainer.querySelector("input.pauseAutoNext").disabled = false;

    const previewContainer = document.querySelector(".autoNextPostPreview");
    previewContainer.innerHTML = "";
    if(!currentPost) {
        document.querySelector(".errors").innerText = "";
        return ean.stop();
    }
    const preview = genPreview(currentPost);
    previewContainer.appendChild(preview);
    resizePreview();
}

function resizePreview() {
    const previewContainer = document.querySelector(".autoNextPostPreview");
    const preview = previewContainer.querySelector("img, video");
    preview.style.display = 'none';
    preview.style['max-height'] = previewContainer.offsetHeight + 'px';
    preview.style['max-width'] = previewContainer.offsetWidth + 'px';
    preview.style.display = '';
}

function genPreview(post) {
    let container;
    switch(post.file.ext) {
        case 'png':
        case 'jpg':
        case 'gif':
            container = document.createElement("img");
            container.src = post.file.url;
            container.style.opacity = 0;
            container.onload = function() {
                this.style.opacity = 1;
            }
        break;
        case 'webm':
            container = document.createElement("video");
            container.type = "video/webm";
            container.autoplay = true;
            container.loop = !ean.waitVideoEnd;
            container.muted = ean.muteVideos;
            container.controls = ean.showControls;
            let source = document.createElement("source");
            source.src = post.file.url;
            container.appendChild(source);
            container.style.opacity = 0;
            container.onloadeddata = function() {
                this.style.opacity = 1;
            }
            container.onended = function() {
                if(ean.waitVideoEnd && ean.status === 'waiting') {
                    this.style.opacity = 0;
                    ean.start();
                }
            }
        break;
    }
    return container;
}