(async () => {
    const req = await fetch('/config');
    globalThis.config = await req.json();
    
    window.onresize = () => {
        if(ean) refreshPostPreview();
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
            container.loop = true;
            let source = document.createElement("source");
            source.src = currentPost.file.url;
            container.appendChild(source);
        break;
    }
    container.style['max-height'] = previewContainer.offsetHeight + 'px';
    container.style['max-width'] = previewContainer.offsetWidth + 'px';
    previewContainer.appendChild(container);
}

function genPreview(post) {
    
}