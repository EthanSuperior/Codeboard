function randomInt(min, max) {
    if (max === undefined) return randomInt(0, min);
    return Math.floor(Math.random() * (max + 1 - min) + min);
}
const randomWholeNumber = randomInt;

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomChance(chance) {
    return Math.random() < chance;
}

function randomChoice(contianer) {
    if (!Array.isArray(contianer)) return contianer[randomChoice(Object.keys(contianer))];
    return contianer[randomInt(contianer.length - 1)];
}

function randomPointInCircle(radius, { minRadius = undefined, start = { x: 0, y: 0 } }) {
    if (minRadius !== undefined) radius = minRadius + Math.random() * (radius - minRadius);
    const angle = Math.random() * Math.PI * 2;
    return {
        x: start.x + Math.cos(angle) * radius,
        y: start.y + Math.sin(angle) * radius,
    };
}

function randomColor() {
    return rgbToHex({ r: randomInt(0, 255), g: randomInt(0, 255), b: randomInt(0, 255) });
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}
function roundBy(value, step = 1) {
    return Math.round(value / step) * step;
}
function round(value, decimals = 0) {
    if (decimals === 0) return Math.round(value);
    return roundBy(value, 1 / Math.pow(10, decimals));
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

const MergeOntoObject = (target, source) => {
    if (!source) return target;
    const sourceKeys = Object.keys(source);
    for (let i = 0; i < sourceKeys.length; i++) {
        const key = sourceKeys[i];
        if (key.startsWith("on")) {
            if (typeof source[key] === "function" && typeof target[key] === "function") {
                // If the key already exists and is a function in the target, append the function
                const func = target[key];
                target[key] = (...args) => {
                    func.call(target, ...args);
                    source[key].call(target, ...args);
                };
            } else target[key] = source[key];
            const event = key.slice(2);
            if (!target[event] && !source[event]) target[event] = (...args) => target.propagate(event, ...args);
        } else target[key] = source[key];
    }
    return target;
};

const AddPublicAccessors = (target, source, properties) => {
    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        Object.defineProperty(target, property, {
            set(val) {
                target[source][property] = val;
            },
            get() {
                return target[source][property];
            },
        });
    }
};
function AddAccessor(obj, propName, { initial, getter, setter } = {}) {
    Object.defineProperty(
        obj,
        propName,
        (function () {
            let val = initial;
            return {
                get: typeof getter === "function" ? () => getter.call(obj, val) ?? val : () => val,
                set: typeof setter === "function" ? (v) => (val = setter.call(obj, val, v) ?? v) : (v) => (val = v),
            };
        })()
    );
}
