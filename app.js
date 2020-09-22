/**
 * @typedef {Object} ImageSource
 * @property {String} webp
 * @property {String} legacy
 */

/**
 * @typedef {Object} AvatarTemplate
 * @property {ImageSource} src
 * @property {ImageSource} preview
 * @property {ImageSource} example
 */

(async () => {

// 如果不是为了添加类型定义，其实可以直接使用对象的解构赋值
const config = await (await fetch('config.json')).json();
/** @type {Number} 生成的头像边长 */
const avatarSize = config.avatarSize;
/** @type {ImageSource} 初始时可以编辑的头像图片 */
const initialImage = config.initialImage;
/** @type {AvatarTemplate[]} 头像模板 */
const templates = config.templates;

/** @type {Boolean} 检查是否支持WebP */
const supportWebP = await new Promise(resolve => {
    const img = new Image;
    img.onload = img.onerror = () => resolve(img.width > 0);
    img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
});

/**
 * document.getElementById的简写
 * @param {String} id
 * @returns {HTMLElement}
 */
const getElementById = id => document.getElementById(id);

// 需要用到的DOM
const editor = getElementById('editor');
const result = getElementById('result');
const templateList = getElementById('template-list');
/** @type {HTMLImageElement} */
const cropperImage = getElementById('cropper-image');
/** @type {HTMLInputElement} */
const uploadImage = getElementById('upload-image');
/** @type {HTMLInputElement} */
const avatarImage = getElementById('avatar-image');
/** @type {HTMLImageElement} */
const previewTemplate = getElementById('preview-template');
/** @type {HTMLButtonElement} */
const uploadImageButton = getElementById('upload-image-btn');
/** @type {HTMLButtonElement} */
const generateButton = getElementById('generate-btn');
/** @type {HTMLButtonElement} */
const retryButton = getElementById('retry-btn');

/**
 * 设置是否显示生成结果
 * @param {Boolean} showResult
 */
const setResult = showResult => {
    editor.classList[showResult ? 'add' : 'remove']('mdui-hidden');
    result.classList[showResult ? 'remove' : 'add']('mdui-hidden');
};

/**
 * 选择图片后设置src
 * @param {String} src
 */
const setUploadedImage = src =>
    new Promise((resolve, reject) => {
        URL.revokeObjectURL(cropperImage.src);
        cropperImage.src = src;
        cropperImage.onload = resolve;
        cropperImage.onerror = reject;
    })
    .then(() => {
        cropper.replace(src);
        cropperImage.classList.remove('mdui-hidden');
    });

/**
 * 设置选择的头像模板
 * @param {AvatarTemplate} template
 */
const setTemplateCurrent = template => {
    templateCurrent = template;
    if (supportWebP && templateCurrent.preview.webp) {
        previewTemplate.src = templateCurrent.preview.webp;
    } else {
        previewTemplate.src = templateCurrent.preview.legacy;
    }
};

retryButton.onclick = () => setResult(false);

uploadImageButton.onclick = () => uploadImage.click();

uploadImage.onchange = () => setUploadedImage(URL.createObjectURL(uploadImage.files[0]));

generateButton.onclick = async () => {
    generateButton.setAttribute('disabled', '');
    generateButton.style.cssText = '';

    /** @type {HTMLCanvasElement} */
    const canvas = cropper.getCroppedCanvas({
        width: avatarSize,
        height: avatarSize,
    });
    const context = canvas.getContext('2d');

    /** @type {HTMLImageElement} */
    const image = await new Promise((resolve, reject) => {
        const image = new Image;
        image.crossOrigin = '';
        if (supportWebP && templateCurrent.src.webp) {
            image.src = templateCurrent.src.webp;
        } else {
            image.src = templateCurrent.src.legacy;
        }
        image.onload = () => resolve(image);
        image.onerror = reject;
    });
    context.drawImage(image, 0, 0, avatarSize, avatarSize);

    URL.revokeObjectURL(avatarImage.src);
    if (navigator.userAgent.toLowerCase().indexOf('micromessenger') !== -1) {
        avatarImage.src = canvas.toDataURL();
    } else {
        avatarImage.src = URL.createObjectURL(await new Promise(resolve => canvas.toBlob(resolve)));
    }

    setResult(true);
    generateButton.removeAttribute('disabled');
    generateButton.style.cssText = 'color:#fff!important';
};

// 添加选择头像模板的div
/** @type {AvatarTemplate} */
let templateCurrent;
const templateDOM = document.createElement('div');
templateDOM.className = 'mdui-shadow-3 mdui-ripple mdui-img-rounded';
templateDOM.style.cssText = 'margin:0 4px;display:inline-block;width:60px;height:60px;background-size:cover;background-position:center;background-image:url(loading.svg)';
const observer = new IntersectionObserver(
    entries => entries
        .reduce((/** @type {HTMLDivElement[]} */ arr, entry) => {
            if (entry.isIntersecting) arr.push(entry.target);
            return arr;
        }, [])
        .forEach(async el => {
            await new Promise((resolve, reject) => {
                const image = new Image;
                image.src = el.getAttribute('data-bg-src');
                image.onload = () => resolve(image);
                image.onerror = reject;
            });
            el.style.backgroundImage = `url(${el.getAttribute('data-bg-src')})`;
            observer.unobserve(el);
        })
);
templates.forEach(template => {
    /** @type {HTMLDivElement} */
    const el = templateDOM.cloneNode();
    el.setAttribute('data-bg-src', (supportWebP && template.example.webp) ? template.example.webp : template.example.legacy);
    el.onclick = () => setTemplateCurrent(template);
    templateList.appendChild(el);
    observer.observe(el);
});

// 初始化
const cropper = new Cropper(cropperImage, {
    aspectRatio: 1,
    autoCropArea: 1,
    rotatable: false,
    checkCrossOrigin: false,
    checkOrientation: false,
    dragMode: 'move',
    preview: '#preview-cropper',
});
setResult(false);
setTemplateCurrent(templates[Math.floor(Math.random() * templates.length)]);
setUploadedImage((supportWebP && initialImage.webp) ? initialImage.webp : initialImage.legacy);

})()