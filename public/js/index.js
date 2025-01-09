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

    document.querySelector(".autoNextForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        try {
            const errors = document.querySelector(".errors");
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
        document.querySelectorAll(`input[type=checkbox]`).forEach(el => el.checked = false);
        const data = JSON.parse(localStorage.eAutoNext);
        Object.keys(data).forEach(key => {
            const input = document.querySelector(`[name=${key}]`);
            switch(input.type) {
                case 'text':
                case 'password':
                case 'number':
                    input.value = data[key];
                break;
                case 'checkbox':
                    input.checked = true;
                break;
            }
        });
    }
})();

function startAutoNext() {
    ean.onnext = refreshPostPreview;
    const controlsContainer = document.querySelector(".autoNextCurrentPostFooter ");
    controlsContainer.querySelector("input.previousPost").disabled = ean.previousPost ? true : false;
    controlsContainer.querySelector("input.nextPost").disabled = ean.nextPost ? true : false;
    controlsContainer.querySelector("input.pauseAutoNext").disabled = false;
    ean.start();
}

function refreshPostPreview() {
    const previousPost = ean.previousPost;
    const currentPost = ean.currentPost;
    const nextPost = ean.nextPost;
    const previewContainer = document.querySelector(".autoNextPostPreview");
    previewContainer.innerHTML = "";
    let container;
    if(!currentPost) {
        document.querySelector(".errors").innerText = "";
        return ean.stop();
    }

    switch(currentPost.file.ext) {
        case 'png':
        case 'jpg':
        case 'gif':
            container = document.createElement("img");
            container.src = currentPost.file.url;
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
            source.src = currentPost.file.url;
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
    previewContainer.appendChild(container);
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

}