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

    document.querySelector("input.openSaveConfigModal").addEventListener("click", function(e) {
        const modal = document.querySelector("dialog.saveConfigModal");
        modal.open = true;
        const input = modal.querySelector("input.saveConfigName");
        input.focus();
    });

    document.querySelector("dialog.saveConfigModal button.cancelSaveConfig").addEventListener("click", resetSaveConfigModal);

    document.querySelector("dialog.saveConfigModal button.saveConfig").addEventListener("click", function(e) {
        const modal = document.querySelector("dialog.saveConfigModal");
        const input = modal.querySelector("input.saveConfigName");
        if(!input.value) {
            input.setAttribute('aria-invalid', true);
            const errors = modal.querySelector('.errors');
            errors.innerText = "Please, provide a name to your config";
            return;
        }
        input.setAttribute('aria-invalid', false);

        if(!localStorage.configs) localStorage.configs = '[]';

        const form = document.querySelector('form.autoNextForm');
        const formData = new FormData(form);
        const config = Object.fromEntries(formData.entries());
        const currentConfigs = JSON.parse(localStorage.configs);
        currentConfigs.push({
            name:input.value,
            created_at:new Date().toJSON(),
            config
        });
        localStorage.configs = JSON.stringify(currentConfigs);
        setTimeout(() => {
            resetSaveConfigModal();
        }, 500);
    });

    if(localStorage.eAutoNext)
        loadConfig(JSON.parse(localStorage.eAutoNext));
})();

function resetSaveConfigModal() {
    const modal = document.querySelector("dialog.saveConfigModal");
    const input = modal.querySelector("input.saveConfigName");
    const errors = modal.querySelector('.errors');
    modal.open = false;
    input.removeAttribute('aria-invalid');
    errors.innerText = "";
}

function loadConfig(config) {
    const options = document.querySelector(`.autoNextOptions`);
    options.querySelectorAll(`input[type=checkbox]`).forEach(el => el.checked = false);
    for(let [key, value] of Object.entries(config)) {
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