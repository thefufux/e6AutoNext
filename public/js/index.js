(async () => {
    const req = await fetch('/config');
    globalThis.config = await req.json();
    
    window.onresize = () => {
        if(ean) resizePreview();
    };

    document.querySelector("a.hideOptions").addEventListener("click", function() {
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
        initConfig();
    });

    document.querySelector("input.pauseAutoNext").addEventListener("click", function() {
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
        e.target.closest(".dropdown").open = false;
        const modal = document.querySelector("dialog.saveConfigModal");
        modal.open = true;
        const input = modal.querySelector("input.saveConfigName");
        input.focus();
    });

    document.querySelector("dialog.saveConfigModal button.cancelSaveConfig").addEventListener("click", resetSaveConfigModal);

    document.querySelector("dialog.saveConfigModal button.saveConfig").addEventListener("click", function() {
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

    document.querySelector("input.openLoadConfigModal").addEventListener("click", function (e) {
        e.target.closest(".dropdown").open = false;
        openLoadConfigModal();
    });

    document.querySelector("dialog.loadConfigModal button.cancelLoadConfig").addEventListener("click", resetLoadConfigModal);

    document.querySelector("dialog.loadConfigModal tbody").addEventListener("click", function(e) {
        if(!localStorage.configs) return;
        const { target } = e;
        const tr = target.closest("tr");
        const index = tr.dataset['index'];
        const configs = JSON.parse(localStorage.configs);
        const config = configs[index];
        if(!config) return;
        if([...target.classList].includes("deleteConfig")) {
            confirm(`Delete "${config.name}"`, `You're going to delete a config named "${config.name}".<br><br>Continue ?`).then(response => {
                if(response) {
                    configs.splice(index, 1);
                    localStorage.configs = JSON.stringify(configs);
                    openLoadConfigModal();
                }
            });
        } else {
            loadConfig(config.config);
            resetLoadConfigModal();
        }
    });

    if(localStorage.eAutoNext)
        loadConfig(JSON.parse(localStorage.eAutoNext));
})();

async function confirm(title = "", message = "") {
    const modal = document.querySelector("dialog.confirmDialog");
    modal.querySelector('.title').innerHTML = title;
    modal.querySelector('.body').innerHTML = message;
    modal.open = true;
    return new Promise((resolve, reject) => {
        modal.querySelector('.yes').addEventListener('click', () => {
            modal.open = false;
            resolve(true);
        }, {once:true});
        modal.querySelector('.no').addEventListener('click', () => {
            modal.open = false;
            resolve(false);
        }, {once:true});
    })

}

function resetSaveConfigModal() {
    const modal = document.querySelector("dialog.saveConfigModal");
    const input = modal.querySelector("input.saveConfigName");
    const errors = modal.querySelector('.errors');
    modal.open = false;
    input.removeAttribute('aria-invalid');
    input.value = "";
    errors.innerText = "";
}

function openLoadConfigModal() {
    const modal = document.querySelector("dialog.loadConfigModal");
    modal.open = true;
    if(!localStorage.configs) localStorage.configs = '[]';
    const configs = JSON.parse(localStorage.configs);
    const tbody = modal.querySelector("tbody.configsList");
    tbody.innerHTML = "";
    configs.forEach((config, index) => {
        const date = new Date(config.created_at);
        tbody.innerHTML += `<tr data-index="${index}">
            <td>${config.name}</td>
            <td>${date.toLocaleString()}</td>
            <td>
                <button class="deleteConfig">Delete</button>
            </td>
        </tr>`;
    });
}

function resetLoadConfigModal() {
    const modal = document.querySelector("dialog.loadConfigModal");
    modal.open = false;
    const tbody = modal.querySelector("tbody.configsList");
    tbody.innerHTML = "";
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

async function initConfig() {
    const errors = document.querySelector(".errors");
    errors.innerHTML = "";
    try {
        const form = document.querySelector('form.autoNextForm');
        const formData = new FormData(form);
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