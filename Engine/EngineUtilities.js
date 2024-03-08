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

function enforceArray(val) {
    return Array.isArray(val) ? val : [val];
}
function getArrayDepth(value) {
    return Array.isArray(value) ? 1 + Math.max(0, ...value.map(getArrayDepth)) : 0;
}

function createTransformationMatrix(x, y, z, thetaX, thetaY, thetaZ) {
    const cosX = Math.cos(thetaX);
    const sinX = Math.sin(thetaX);
    const cosY = Math.cos(thetaY);
    const sinY = Math.sin(thetaY);
    const cosZ = Math.cos(thetaZ);
    const sinZ = Math.sin(thetaZ);

    const matrix = [
        [cosY * cosZ, -cosY * sinZ, sinY, 0],
        [cosX * sinZ + sinX * sinY * cosZ, cosX * cosZ - sinX * sinY * sinZ, -sinX * cosY, 0],
        [sinX * sinZ - cosX * sinY * cosZ, sinX * cosZ + cosX * sinY * sinZ, cosX * cosY, 0],
        [x, y, z, 1],
    ];
    return matrix;
}

function multiplyMatrixAndPoint(matrix, point) {
    // Access each part of the matrix with two indices (row and column)
    const c0r0 = matrix[0][0],
        c1r0 = matrix[0][1],
        c2r0 = matrix[0][2],
        c3r0 = matrix[0][3];
    const c0r1 = matrix[1][0],
        c1r1 = matrix[1][1],
        c2r1 = matrix[1][2],
        c3r1 = matrix[1][3];
    const c0r2 = matrix[2][0],
        c1r2 = matrix[2][1],
        c2r2 = matrix[2][2],
        c3r2 = matrix[2][3];
    const c0r3 = matrix[3][0],
        c1r3 = matrix[3][1],
        c2r3 = matrix[3][2],
        c3r3 = matrix[3][3];

    const x = point[0],
        y = point[1],
        z = point[2] ?? 0,
        w = point[3] ?? 1;

    const resultX = x * c0r0 + y * c0r1 + z * c0r2 + w * c0r3;
    const resultY = x * c1r0 + y * c1r1 + z * c1r2 + w * c1r3;
    const resultZ = x * c2r0 + y * c2r1 + z * c2r2 + w * c2r3;
    const resultW = x * c3r0 + y * c3r1 + z * c3r2 + w * c3r3;

    return [resultX, resultY, resultZ, resultW];
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
function deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
        // If the input is not an object or is null, return it directly
        return obj;
    }

    if (Array.isArray(obj)) {
        // If it's an array, recursively deep clone each element
        return obj.map((item) => deepClone(item));
    }

    // If it's an object, recursively deep clone each property
    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }

    return clonedObj;
}
const MergeOntoObject = (target, source) => {
    if (!source || source == {}) return target;
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
            } else target[key] = deepClone(source[key]);
            const event = key.slice(2);
            if (!target[event] && !source[event]) target[event] = (...args) => target.propagate(event, ...args);
        } else target[key] = deepClone(source[key]);
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
