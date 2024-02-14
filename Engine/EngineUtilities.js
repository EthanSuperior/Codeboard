function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}
function appendToFunction(obj, funcName, additionalFunc, { hasPriority } = {}) {
    const baseFunc = obj[funcName];
    obj[funcName] = function (...args) {
        if (hasPriority) additionalFunc.call(this, ...args);
        baseFunc.call(this, ...args);
        if (!hasPriority) additionalFunc.call(this, ...args);
    };
}
function cloneMouseEvent(originalEvent) {
    const {
        type,
        bubbles,
        cancelable,
        view,
        detail,
        screenX,
        screenY,
        clientX,
        clientY,
        mouseX,
        mouseY,
        canvasX,
        canvasY,
        ctrlKey,
        altKey,
        shiftKey,
        metaKey,
        button,
        relatedTarget,
    } = originalEvent;

    const newEvent = new MouseEvent(type, {
        bubbles,
        cancelable,
        view,
        detail,
        screenX,
        screenY,
        clientX,
        clientY,
        ctrlKey,
        altKey,
        shiftKey,
        metaKey,
        button,
        relatedTarget,
    });
    return Object.assign(newEvent, {
        mouseX,
        mouseY,
        canvasX,
        canvasY,
    });
}
function hexToRgb(hex) {
    // Remove the hash if it's included
    hex = hex.replace(/^#/, "");

    // Parse the hex values
    const bigint = parseInt(hex, 16);

    // Extract RGB components
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return { r, g, b };
}
function rgbToHex(rgb) {
    return `#${((1 << 24) | (rgb.r << 16) | (rgb.g << 8) | rgb.b).toString(16).slice(1)}`;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// SOUND FUNCTIONS - https://sfxr.me/
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const playSoundEffect = (source, options) => {
    if (options?.global) return LayerManager.global.playSoundEffect(source, options);
    else return LayerManager.currentLayer.playSoundEffect(source, options);
};

const playMusic = (source, options) => {
    if (options?.global) return LayerManager.global.playMusic(source, options);
    else return LayerManager.currentLayer.playMusic(source, options);
};
