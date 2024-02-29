/**
 * The Codeboard engine was created by Evan Chase with valuable assistance from Brandon Graham,
 * designed specifically for the BYU Game Dev Club.
 *
 * The aim of Codeboard is to provide a user-friendly environment with minimal coding requirements,
 * catering to individuals with little to no coding experience. It serves as a tool to facilitate
 * game development within the BYU Game Dev Club community.
 *
 * This code is released under the Creative Commons Zero (CC0) license, allowing users to freely
 * copy, modify, and distribute the work for any purpose without seeking permission.
 * The contributors have waived all copyright and related rights to the extent possible under law.
 *
 * For more details, view the full legal text at:
 * {@link https://creativecommons.org/publicdomain/zero/1.0/}
 *
 * @author Evan Chase
 * @contributor Brandon Graham
 * @license CC0
 * @see {@link https://creativecommons.org/publicdomain/zero/1.0/}
 */

// PUBLIC OBJECTS
// MouseEvents = {Up:Function,Move:Function,Down:Function}
// UpKeyEvents = {KeyCode:Function}
// DownKeyEvents = {KeyCode:Function}
// CONTRACTED FUNCTIONS
// load()
// updateGame(delta)

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EngineCore.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
class Identifiable {
    constructor(id) {
        this.id = id || crypto.randomUUID();
    }
    raise = (call, ...args) => {
        if (this.hasOwnProperty(call)) this[call].call(this, ...args);
    };
    propagate = (call, ...args) => this.raise("on" + call, ...args);
}
class Updatable extends Identifiable {
    draw = () => this.propagate("draw");
    pause = () => this.propagate("pause");
    resume = () => this.propagate("resume");
    update = (delta) => this.propagate("update", delta);
}
class Interactable extends Updatable {
    pageinteract = () => this.propagate("pageinteract");
    // Helper Utils
    modmouseevent = (e) => e;
    shouldinteract = (e) => false;
    modkeyevent = (e) => e;
    // IO Events
    keydown = (e) => this.propagate("keydown", this.modkeyevent(e));
    keyup = (e) => this.propagate("keyup", this.modkeyevent(e));
    // Mouse IO Events
    mousedown = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mousedown", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mymousedown", e);
    };
    mymousedown = (e) => this.raise("onmymousedown", e);
    mouseup = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mouseup", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mymouseup", e);
    };
    mymouseup = (e) => this.raise("onmymouseup", e);
    mousemove = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mousemove", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) {
            this.raise("mymousemove", e);
            this.hovered = true;
        } else this.hovered = false;
    };
    mymousemove = (e) => this.raise("onmymousemove", e);
    click = (e) => {
        e = this.modmouseevent(e);
        this.propagate("click", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("myclick", e);
    };
    myclick = (e) => this.raise("onmyclick", e);
    dblclick = (e) => {
        e = this.modmouseevent(e);
        this.propagate("dblclick", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mydblclick", e);
    };
    mydblclick = (e) => this.raise("onmydblclick", e);
    wheel = (e) => {
        e = this.modmouseevent(e);
        this.propagate("wheel", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mywheel", e);
    };
    mywheel = (e) => this.raise("onmywheel", e);
}
class IterableWeakRef {
    #list = [];
    [Symbol.iterator]() {
        let index = this.#list.length;
        return {
            next: () => {
                while (index > 0) {
                    const value = this.#list[--index].deref();
                    if (value === undefined) {
                        this.#list.splice(index, 1);
                        continue;
                    }
                    return { value, done: false };
                }
                return { done: true };
            },
        };
    }
    push = (value) => {
        this.#list.push(new WeakRef(value));
    };
    forEach = (callback) => {
        for (const value of this) {
            callback(value);
        }
    };
    remove(id) {
        const indexToRemove = this.#list.findIndex((weakRef) => {
            const value = weakRef.deref();
            return value && value.id === id;
        });
        if (indexToRemove !== -1) this.#list.splice(indexToRemove, 1);
    }
}

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
const keys = {};
const mouse = { x: 0, y: 0 };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EngineUtilities.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
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
            if (!target[event] && !source[event]) target[event] = (...args) => target.raise(key, ...args);
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

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EnginePhysics.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
class Vector {
    #direction;
    #speed;
    constructor(direction = null, speed = 0) {
        this.#direction = direction;
        this.#speed = speed;
    }
    get direction() {
        return this.#direction;
    }
    set direction(val) {
        this.#direction = val;
    }
    get speed() {
        return this.#speed;
    }
    set speed(val) {
        this.#speed = val;
    }
    set x(value) {
        const velY = this.y;
        this.#speed = Math.hypot(value, velY);
        this.#direction = Math.atan2(velY, value);
    }
    get x() {
        if (this.#direction == null) return 0;
        return this.#speed * Math.cos(this.#direction);
    }
    get xSign() {
        return Math.abs(this.x) < 1e-10 ? 0 : Math.sign(this.x);
    }
    set y(value) {
        const velX = this.x;
        this.#speed = Math.hypot(velX, value);
        this.#direction = Math.atan2(value, velX);
    }
    get y() {
        if (this.#direction == null) return 0;
        return this.#speed * Math.sin(this.#direction);
    }
    get ySign() {
        return Math.abs(this.y) < 1e-10 ? 0 : Math.sign(this.y);
    }
    get magnitude() {
        return this.#speed;
    }
    set magnitude(val) {
        this.#speed = val;
    }
}

/**
SpacialMap {IO}
├───Tile{Entity}
└───NavMesh
    ├───Collisions
    └───Pathfinding
 */
class SpacialMap extends Interactable {
    entities = {};
    constructor(layer) {
        super();
        this.layer = layer;
    }
    propagate = (call, ...args) => {
        this.raise("on" + call, ...args);
        const keys = EntityManager.names;
        for (let j = 0; j < keys.length; j++) {
            const key = keys[j];
            if (!this.entities[key]) continue;
            for (let i = this.entities[key].length - 1; i >= 0; i--) this.entities[key][i].raise(call, ...args);
        }
    };
    getEntities = (groupName) => {
        if (!groupName) return Object.values(this.entities).flatMap((a) => a);
        else return this.entities[groupName] ?? [];
    };
    modmouseevent = (e) => {
        const newE = cloneMouseEvent(e);
        if (this.layer.cameraX) newE.mouseX += this.layer.cameraX;
        if (this.layer.cameraY) newE.mouseY += this.layer.cameraY;
        return newE;
    };
    addEntity = (child) => {
        this.entities[child.groupName] ??= [];
        this.entities[child.groupName].push(child);
    };
    removeEntity = (child) => {
        const id = typeof child === "string" ? child : child && typeof child.id === "string" ? child.id : null;
        const idx = this.entities[child.groupName].findIndex((e) => e.id === id);
        if (idx !== -1) this.entities[child.groupName].splice(idx, 1);
    };
    //TODO FINISH THIS AND ENTITY MANAGER
    //ADD REMOVE_FROM_PARENTS
    //Redo Lerps not to use Entity
}

function detectRect(x, y, w, h, ptX, ptY) {
    return ptX >= x && ptX <= x + w && ptY >= y && ptY <= y + h;
}
function detectCircle(x, y, r, ptX, ptY) {
    const squaredDistance = (x - ptX) ** 2 + (y - ptY) ** 2;
    return squaredDistance <= r ** 2;
}
function detectEntity(entityOne, entityTwo, radius) {
    radius ??= (entityOne.size + entityTwo.size) / 2;
    return distanceTo(entityOne, entityTwo) <= radius;
}
function outOfBounds(entity, { padding } = {}) {
    if (padding === undefined) padding = entity.size ?? 0;
    return (
        entity.y < -padding ||
        entity.y > game.height + padding ||
        entity.x < -padding ||
        entity.x > game.width + padding
    );
}
function distanceTo(from, to) {
    return Math.hypot(from.x - to.x, from.y - to.y);
}
function angleTo(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}
function getPlayerMovementdirectionection({ useCardinal } = {}) {
    let direction = null;

    // Check for horizontal movement
    if ((keys["ArrowLeft"] || keys["KeyA"]) && !(keys["ArrowRight"] || keys["KeyD"])) {
        direction = Math.PI; // Left
    } else if ((keys["ArrowRight"] || keys["KeyD"]) && !(keys["ArrowLeft"] || keys["KeyA"])) {
        direction = 0; // Right
    }

    // Check for vertical movement
    if ((keys["ArrowUp"] || keys["KeyW"]) && !(keys["ArrowDown"] || keys["KeyS"])) {
        direction = -Math.PI / 2; // Up
    } else if ((keys["ArrowDown"] || keys["KeyS"]) && !(keys["ArrowUp"] || keys["KeyW"])) {
        direction = Math.PI / 2; // Down
    }

    if (useCardinal) return direction;

    // Adjust for diagonals
    if ((keys["ArrowUp"] || keys["KeyW"]) && (keys["ArrowLeft"] || keys["KeyA"])) {
        direction = (-3 * Math.PI) / 4; // Up-Left
    }
    if ((keys["ArrowUp"] || keys["KeyW"]) && (keys["ArrowRight"] || keys["KeyD"])) {
        direction = -Math.PI / 4; // Up-Right
    }
    if ((keys["ArrowDown"] || keys["KeyS"]) && (keys["ArrowLeft"] || keys["KeyA"])) {
        direction = (3 * Math.PI) / 4; // Down-Left
    }
    if ((keys["ArrowDown"] || keys["KeyS"]) && (keys["ArrowRight"] || keys["KeyD"])) {
        direction = Math.PI / 4; // Down-Right
    }

    return direction;
}
function onboxcollide(other) {
    const thisLeft = this.x - this.size / 2;
    const thisRight = this.x + this.size / 2;
    const thisTop = this.y - this.size / 2;
    const thisBottom = this.y + this.size / 2;

    const otherLeft = other.x - other.size / 2;
    const otherRight = other.x + other.size / 2;
    const otherTop = other.y - other.size / 2;
    const otherBottom = other.y + other.size / 2;

    const xOverlap = thisRight > otherLeft && thisLeft < otherRight;
    const yOverlap = thisBottom > otherTop && thisTop < otherBottom;
    if (xOverlap) {
        // Handle the collision based on the relative velocities
        if (other.velocity.xSign === 1) {
            other.x = thisLeft - other.size / 2;
            other.velocity.x = 0;
        } else if (other.velocity.xSign === -1) {
            other.x = thisRight + other.size / 2;
            other.velocity.x = 0;
        }
    }
    if (yOverlap) {
        if (other.velocity.ySign === 1) {
            other.y = thisTop - other.size / 2;
            other.velocity.y = 0;
        } else if (other.velocity.ySign === -1) {
            other.y = thisBottom + other.size / 2;
            other.velocity.y = 0;
        }
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EngineAsync.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
class AsyncManager extends Updatable {
    tasks = [];
    lerps = [];
    constructor(layer) {
        super();
        this.layer = layer;
    }
    propagate = (call, ...args) => {
        this.raise("on" + call, ...args);
        for (let i = this.tasks.length - 1; i >= 0; i--) this.tasks[i].raise(call, ...args);
        for (let i = this.lerps.length - 1; i >= 0; i--) this.lerps[i].raise(call, ...args);
    };
    scheduleTask = (func, options = {}, ...args) => {
        if (options.delay) {
            const { delay, ...newOp } = options;
            return this.scheduleTask(this.scheduleTask, { time: delay }, newOp);
        }
        let task = options.id && this.findTask(options.id);
        if (task) {
            task.func = func;
            task.args = args;
            task.time = 1_000 * options.time ?? task.time;
            task.loop = !!(options.loop ?? task.loop);
        } else {
            task = new Task(func, options, ...args);
            task.manager = this;
            this.tasks.push(task);
            if (options.expires) this.scheduleTask(() => clearTask(task.id), { time: options.expires });
        }
        task.refresh();
        return task.id;
    };
    findTask = (id) => this.tasks.find((t) => t.id === id);
    clearTask = (id) => {
        const idx = this.tasks.findIndex((e) => e.id === id);
        if (idx < 0) return;
        this.tasks.splice(idx, 1)[0].pause();
    };
    // Sound Methods
    sounds = new IterableWeakRef();
    playSoundEffect = (source, options = {}) => {
        if (!LayerManager.interacted) return;
        const { playrate, volume } = options;
        let soundBite = new Audio(source);
        if (playrate) soundBite.playbackRate = playrate;
        if (volume) soundBite.volume = volume;
        soundBite.addEventListener("canplaythrough", soundBite.play);
        this.sounds.push(soundBite);
        soundBite.addEventListener("ended", () => (soundBite.play = () => {}));
    };
    playMusic = (source, options = {}) => {
        if (!LayerManager.interacted) return (this.onpageinteract = () => this.playMusic(source, options));
        const { playrate, volume } = options;
        if (this.music === undefined) {
            this.music = new Audio();
            this.music.loop = true;
            this.music.addEventListener("canplaythrough", this.music.play);
        }
        if (playrate) this.music.playbackRate = playrate;
        if (volume) this.music.volume = volume;
        this.music.src = source;
    };
}
class Task extends Identifiable {
    constructor(func, { time, loop, id, immediate } = {}, ...args) {
        super(id);
        this.func = func;
        this.args = args;
        this.time = 1_000 * (time ?? 0);
        this.loop = !!loop;
        this.ispaused = false;
        this.startTime = Date.now();
        this.remaining = this.time;
        this.timeout = () => {
            if (this.ispaused) return;
            this.func(...this.args);
            if (this.loop) this.start(this.time);
            else this.manager.clearTask(this.id);
        };
        if (immediate) this.func(...this.args);
    }
    start = (delay) => {
        if (this.ispaused) return;
        this.startTime = Date.now();
        clearTimeout(this.timer);
        this.timer = setTimeout(this.timeout, delay);
    };
    pause = () => {
        if (this.ispaused) return;
        this.ispaused = true;
        clearTimeout(this.timer);
        this.remaining = this.time - (Date.now() - this.startTime);
    };
    resume = () => {
        this.peek();
        this.ispaused = false;
        clearTimeout(this.timer);
        this.start(this.remaining);
    };
    refresh = () => {
        if (this.ispaused) return;
        this.pause();
        this.resume();
    };
    peek = () => {
        if (this.ispaused) return this.remaining;
        this.remaining = this.time - (Date.now() - this.startTime);
        return this.remaining;
    };
    extend = (addtionalTime) => {
        this.time += 1_000 * addtionalTime;
        this.resume();
    };
}
class Lerp extends Updatable {
    constructor(obj, func, duration, layer) {
        super();
        this.currentTime = 0;
        this.callback = func;
        this.duration = this.duration;
        this.obj = obj;
        this.layer = layer;
        this.layer.asyncManager.lerps.push(this);
    }
    onupdate = (delta) => {
        this.currentTime += delta;
        this.progress = clamp(this.currentTime / duration, 0, 1);
        this.callback.call(this.obj, this.progress);
        if (this.progress == 1) this.remove();
    };
    remove = () => this.layer.asyncManager.removeLerp(this);
    pause = () => {
        this.tasks.forEach((t) => t.pause());
        this.sounds.forEach((s) => s.pause());
        this.music?.pause();
    };
    resume = () => {
        this.tasks.forEach((t) => t.resume());
        if (LayerManager.interacted) this.sounds.forEach((s) => s.play());
        if (LayerManager.interacted) this.music?.play();
    };
}
const lerp = (start, end, progress) => start + progress * (end - start);
function startLerp(obj, lerpFunc, duration, { layer } = {}) {
    new Lerp(obj, lerpFunc, duration, layer ?? LayerManager.currentLayer);
}
function propertyLerp(obj, prop, start, end, duration) {
    startLerp(obj, (t) => (obj[prop] = lerp(start, end, t)), duration);
}
function colorLerp(obj, lerpFunc, startColorHex, endColorHex, duration) {
    const startColor = hexToRgb(startColorHex);
    const endColor = hexToRgb(endColorHex);
    startLerp(
        obj,
        (progress) => {
            const r = Math.round(lerp(startColor.r, endColor.r, progress));
            const g = Math.round(lerp(startColor.g, endColor.g, progress));
            const b = Math.round(lerp(startColor.b, endColor.b, progress));
            lerpFunc.call(obj, rgbToHex({ r, g, b }));
        },
        duration
    );
}

const scheduleTask = (func, options, ...args) => {
    if (options?.global) return LayerManager.global.scheduleTask(func, options, ...args);
    else return LayerManager.currentLayer.scheduleTask(func, options, ...args);
};
const clearTask = (id, options) => {
    if (options?.global) return LayerManager.global.clearTask(id);
    else return LayerManager.currentLayer.clearTask(id);
};
const findTask = (id, options) => {
    if (options?.global) return LayerManager.global.findTask(id);
    else return LayerManager.currentLayer.findTask(id);
};

const pause = () => LayerManager.pause();
const resume = () => LayerManager.resume();

const togglePause = () => (LayerManager.ispaused ? resume : pause)();

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EngineEntity.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
class EntityManager {
    static types = {};
    static names = [];
    static subtypes = {};
}
class Entity extends Interactable {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.size = 0;
        this.velocity = new Vector();
        AddPublicAccessors(this, "velocity", ["speed", "direction", "magnitude"]);
        this.exp = 0;
        this.neededXP = 0;
        this.level = 0;
        this.staticX = false;
        this.staticY = false;
        this.facingDirection = 0;
        this.groupName = "Entity";
    }
    update = (delta) => {
        if (this.acceleration) this.speed = clamp(this.speed + this.acceleration, 0, this.maxSpeed);
        this.raise("onupdate", delta);
        // if (this.groupName == "Player") console.log(this, this.direction, this.speed);
        if (this.speed && this.direction !== null) {
            this.facingDirection = this.direction;
            if (!this.staticX) this.x += Math.cos(this.direction) * this.speed * delta;
            if (!this.staticY) this.y += Math.sin(this.direction) * this.speed * delta;
        }
        if (this.pixelPerfect) {
            this.x = Math.round(this.x - 0.5) + 0.5;
            this.y = Math.round(this.y - 0.5) + 0.5;
        }
        if (this.collisions) this.checkCollision();
    };
    checkCollision = () => {
        for (let group of this.collisions) {
            for (let e of this.layer.getEntities(group)) {
                if (group === this.groupName && e.id === this.id) continue;
                // if (this.groupName === "Bullet")
                if (this.distanceTo(e) <= (this.size + e.size) / 2) {
                    // console.log(
                    //     this.distanceTo(e),
                    //     (this.size + e.size) / 2,
                    //     this.distanceTo(e) <= (this.size + e.size) / 2
                    // );
                    // game.background = "red";
                    this.raise("collide", e);
                }
                //  else game.background = "black";
            }
        }
    };
    collide = (other) => this.raise("oncollide", other);
    spawn = () => {
        if (this.acceleration) this.maxSpeed ??= this.speed;
        if (this.hp) this.maxHP ??= this.hp;
        this.layer.addEntity(this);
        this.raise("onspawn");
        if (this.lifespan) this.lifeTimer = scheduleTask(() => this.despawn(), { time: this.lifespan });
    };
    do = (func, ...args) => func.call(this, ...args);
    draw = () => {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.rotate) ctx.rotate(this.direction + Math.PI / 2 + (this.rotationalOffset ?? 0));
        const halfSize = this.size / 2;
        if (this.img) {
            ctx.save();
            ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
            drawImage(this.img, -halfSize, -halfSize, { width: this.size, height: this.size });
            ctx.restore();
            //TODO: ONLOAD ANIMATION CODE
        } else {
            ctx.fillStyle = this.color;
            if (this.shape == "circle") {
                ctx.beginPath();
                ctx.arc(0, 0, halfSize, 0, 2 * Math.PI);
                ctx.fill();
                ctx.closePath();
            } else if (this.shape == "triangle") {
                ctx.beginPath();
                ctx.moveTo(0, -halfSize);
                ctx.lineTo(-halfSize, halfSize);
                ctx.lineTo(halfSize, halfSize);
                ctx.fill();
                ctx.closePath();
            } else if (this.shape == "arrow") {
                ctx.beginPath();
                ctx.moveTo(0, -halfSize);
                ctx.lineTo(-halfSize, halfSize);
                ctx.lineTo(0, halfSize / 2);
                ctx.lineTo(halfSize, halfSize);
                ctx.fill();
                ctx.closePath();
            } else ctx.fillRect(-halfSize, -halfSize, this.size, this.size);
        }
        this.raise("ondraw");
        ctx.restore();
    };
    despawn = () => {
        this.raise("ondespawn");
        if (this.lifeTimer) clearTask(this.lifeTimer);
        this.layer.removeEntity(this);
    };
    angleTowards = (entity) => {
        this.direction = angleTo(this, entity);
    };
    distanceTo = (entity) => distanceTo(this, entity);
    levelup = () => {
        this.level++;
        this.raise("onlevelup");
    };
    get xp() {
        return this.exp;
    }
    set xp(value) {
        this.exp = value;
        if (!this.neededXP) return;
        while (this.exp >= this.neededXP) {
            this.exp -= this.neededXP;
            this.raise("levelup");
        }
    }
}

function registerEntity(name, options, types) {
    const upperName = name[0].toUpperCase() + name.slice(1);
    const lowerName = name[0].toLowerCase() + name.slice(1);
    const newSubclass = class extends Entity {
        groupName = upperName;
    };
    Object.defineProperty(newSubclass, "subtypes", {
        set(value) {
            types = value;
        },
        get() {
            return types;
        },
    });
    // Object.defineProperty(newSubclass, "group", {
    //     value: Array.from({ length: LayerManager.layers.length }, () => []),
    // });
    // newSubclass.group = newSubclass.group[-1] = [];
    // Object.defineProperty(globalThis, lowerName + "Group", {
    //     get() {
    //         return newSubclass.group;
    //     },
    //     set(value) {
    //         newSubclass.group = value;
    //     },
    // });
    globalThis["spawn" + upperName] = (subType, additional) => {
        const newEntity = new newSubclass();
        MergeOntoObject(newEntity, game.settings);
        MergeOntoObject(newEntity, options);
        MergeOntoObject(newEntity, subType);
        MergeOntoObject(newEntity, additional);
        newEntity.layer = LayerManager.currentLayer;
        newEntity.raise("spawn");
        return newEntity;
    };
    globalThis["forEvery" + upperName + "Do"] = (func, ...args) => {
        LayerManager.getEntities(upperName).forEach((e) => e.do(func, ...args));
    };
    EntityManager.types[upperName] = newSubclass;
    EntityManager.names.push(upperName);
    if (types) {
        EntityManager.subtypes[upperName] = types;
        const typeKeys = Object.keys(types);
        for (let i = 0; i < typeKeys.length; i++) {
            const type = typeKeys[i];
            types[type].type = type;
        }
        globalThis[lowerName + "Types"] = types;
        globalThis["forEvery" + upperName + "TypeDo"] = (func, ...args) => {
            const keys = Object.keys(newSubclass.subtypes);
            for (let i = 0; i < keys.length; i++) func.call(newSubclass.subtypes[keys[i]], ...args);
        };
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EngineUI.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/**
 * Options for configuring UI elements and their event callbacks.
 * @typedef {object} UIOptions
 * @property {boolean} [overlay] - Render to current layer or not
 * @property {function(number)} [onupdate] - Callback for the update event.
 * @property {function()} [onpageinteract] - Callback for the pageinteract event.
 * @property {function(Event)} [onkeydown] - Callback for the keydown event.
 * @property {function(Event)} [onkeyup] - Callback for the keyup event.
 * @property {function(MouseEvent)} [onmymousedown] - Callback for the mymousedown event.
 * @property {function(MouseEvent)} [onmymouseup] - Callback for the mymouseup event.
 * @property {function(MouseEvent)} [onmymousemove] - Callback for the mymousemove event.
 * @property {function(MouseEvent)} [onmyclick] - Callback for the myclick event.
 * @property {function(MouseEvent)} [onmydblclick] - Callback for the mydblclick event.
 * @property {function(mywheelEvent)} [onmywheel] - Callback for the mywheel event.
 */
class UIElement extends Interactable {
    // Get callback assigned on adding to get the layer and manager.
    constructor(x, y, { layer, ...options } = {}) {
        super(options.id);
        this.x = x;
        this.y = y;
        this.layer = layer;
        this.options = options;
        AddPublicAccessors(this, "options", Object.keys(options));
    }
    children = [];
    parent = null;
    get root() {
        let root = this;
        while (root.parent !== null) root = root.parent;
        return root;
    }
    get = (id) => this.children.find((e) => e.id === id);
    add = (child) => {
        child.parent = this;
        this.raise("onadd", child);
        this.children.push(child);
        return child;
    };
    remove = (child) => {
        const id = typeof child === "string" ? child : child && typeof child.id === "string" ? child.id : null;
        const idx = this.children.findIndex((e) => e.id === id);
        if (idx !== -1) this.children.splice(idx, 1);
    };
    propagate = (call, ...args) => {
        this.raise("on" + call, ...args);
        this.children.forEach((c) => c?.raise(call, ...args));
    };
    draw = () => this.propagate("draw");
    show = () => {
        this.raise("onshow");
        this.children.forEach((c) => c.raise("onshow"));
        if (!this.layer) {
            if (this.options.overlay) {
                this.layer = LayerManager.currentLayer;
                this.close = this.layer.removeUI.bind(this.layer, this);
            } else {
                this.layer = new Layer();
                this.close = LayerManager.pop.bind(LayerManager);
            }
        } else this.close = this.layer.removeUI.bind(this.layer, this);
        this.layer.addUI(this);
    };
    close = () => {};
    shouldinteract = (mX, mY) => true;
    hide = () => {
        this.close();
    };
    onadd = (ui) => {
        ui.shift(this.x, this.y);
    };
    shift = (x, y) => {
        this.x += x;
        this.y += y;
        this.propagate("shift", x, y);
    };
}
class UIRoot extends UIElement {
    constructor(layer) {
        super(0, 0, { layer });
    }
    add = (child) => {
        child.parent = null;
        this.raise("onadd", child);
        this.children.push(child);
        return child;
    };
}
/**
 * Options for styling a shape with hover effects.
 * @typedef {UIOptions} ColorOptions
 * @property {string} fill - Fill color of the element.
 * @property {string} stroke - Stroke color of the element.
 * @property {number} strokeWidth - Stroke width of the element.
 * @property {string} hoverFill - Fill color when hovered.
 * @property {string} hoverStroke - Stroke color when hovered.
 * @property {number} hoverWidth - Stroke width when hovered.
 */

/**
 * Options for configuring a rectangular UI element.
 * @typedef {UIOptions} RectOptions
 * @property {number} [cornerRadius=0] - Radius of the rounded corners.
 */
class UIRect extends UIElement {
    ondraw = () => drawRect(this.x, this.y, this.width, this.height, { ...this.options, hovered: this.hovered });
    shouldinteract = (mX, mY) => detectRect(this.x, this.y, this.width, this.height, mX, mY);
}
class UICircle extends UIElement {
    ondraw = () => drawCircle(this.x, this.y, this.radius, { ...this.options, hovered: this.hovered });
    shouldinteract = (mX, mY) => detectCircle(this.x, this.y, this.radius, mX, mY);
}
/**
 * Options for styling text within a UI element.
 * @typedef {UIOptions} TextOptions
 * @property {number} [width] - The width of the text container.
 * @property {string} [font] - The font style for the text.
 * @property {string} [color] - The color of the text.
 * @property {boolean} [center] - Whether to center the text horizontally.
 * @property {boolean} [linewrap] - Whether to enable line wrapping for the text.
 */
class UIText extends UIElement {
    ondraw = () => drawText(this.text, this.x, this.y, this.options);
}
class UIImage extends UIElement {
    ondraw = () => drawImage(this.src, this.x, this.y, this.options);
}
/**
 * Options for configuring a text input UI element.
 * @typedef {TextOptions} TextInputOptions
 * @property {string} [placeholder] - The placeholder text for the input.
 * @property {function(string)} [oninput] - Callback for the input event.
 * @property {function(string)} [onsubmit] - Callback for the submit event.
 * @param {boolean} [options.autofocus] - Whether the text input should autofocus.
 */
class UITextInput extends UIElement {
    onkeydown = (e) => {
        if (this.isFocused) {
            if (e.key === "Backspace") this.text = this.text.slice(0, -1);
            else if (e.key.length > 1 || e.ctrlKey || e.altKey || e.metaKey) return;
            else this.text += e.key;
            this.raise("oninput", this.text);
        }
    };
    onkeyup = (e) => {
        if (this.isFocused && e.key === "Enter") {
            this.isFocused = false;
            this.raise("onsubmit", this.text);
        }
    };
    myclick = (e) => {
        this.isFocused = this.shouldinteract(e.mouseX, e.mouseY);
    };

    ondraw = () => {
        if (this.font) ctx.font = this.font;
        const fontSize = parseInt(ctx.font);
        // Draw the input box
        ctx.clearRect(this.x, this.y, this.width, fontSize);
        drawRect(this.x, this.y, this.width, fontSize, { stroke: "black", hovered: this.hovered });
        // Draw the text inside the input box
        ctx.textBaseline = "middle";
        if (this.color) ctx.fillStyle = this.color;
        ctx.textBaseline = "middle";
        ctx.fillText(this.text, this.x, this.y + fontSize / 2, this.width);
    };
    shouldinteract = (mX, mY) =>
        detectRect(this.x, this.y, this.width, parseInt(this.font ? this.font : ctx.font), mX, mY);
}
class UIProgressBar extends UIElement {
    get progress() {
        return this.getprogress();
    }
    ondraw = () => {
        // Draw the background
        drawRect(this.x, this.y, this.width, this.height, {
            ...this.options,
            fill: this.background,
            hovered: this.hovered,
        });

        // Draw the progress bar
        if (this.fill) {
            ctx.fillStyle = this.fill;
            ctx.fillRect(this.x, this.y, this.progress * this.width, this.height);
        }
    };
}
class UIDialogue extends UIElement {
    shouldinteract = (mX, mY) =>
        detectRect(
            this.x + this.scale / 2,
            this.y + this.height - this.scale - this.scale / 2,
            this.width - this.scale,
            this.scale,
            mX,
            mY
        );
    ondraw = () => {
        drawRect(this.x, this.y, this.width, this.height, {
            ...this.options,
            fill: this.background,
            hovered: this.hovered,
        });
        drawText(this.title, this.x, this.y + this.scale, {
            center: true,
            font: `bold ${this.scale}px monospace`,
            ...this.options,
        });
        drawText(this.message, this.x, this.y + this.scale + this.scale, {
            font: `bold ${this.scale / 2}px monospace`,
            center: true,
            ...this.options,
        });
        drawRect(
            this.x + this.scale / 2,
            this.y + this.height - this.scale - this.scale / 2,
            this.width - this.scale,
            this.scale,
            { ...this.options, hovered: this.hovered }
        );
        drawText(this.buttonText, this.x, this.y + this.height - this.scale, {
            font: `bold ${this.scale * 0.75}px monospace`,
            center: true,
            ...this.options,
        });
    };
}
class UIScroll extends UIElement {
    content = { width: this.scrollWidth, height: this.scrollHeight };
    scroll = { x: !!(this.width < this.scrollWidth), y: !!(this.height < this.scrollHeight) };
    scrollPosition = { x: 0, y: 0 };
    displayWidth = this.scrollWidth - this.width;
    displayHeight = this.scrollHeight - this.height;
    onwheel = (e) => {
        this.scrollPosition.x = clamp(this.scrollPosition.x + e.deltaX, 0, this.displayWidth);
        this.scrollPosition.y = clamp(this.scrollPosition.y + e.deltaY, 0, this.displayHeight);
        this.mymousemove(e);
    };
    onmymousedown = (e) => {
        this.scrolling = true;
        this.jumpscroll();
    };
    onmymouseup = (e) => {
        this.jumpscroll();
        this.scrolling = false;
    };
    onmymousemove = (e) => {
        this.jumpscroll();
    };
    jumpscroll = () => {
        if (!this.scrolling) return;
        const myclickedX =
            this.scroll.x &&
            detectRect(x, y + this.height - this.scrollBarWidth, this.width, this.scrollBarWidth, mouse.x, mouse.y);
        const myclickedY =
            this.scroll.y &&
            detectRect(x + this.width - this.scrollBarWidth, y, this.scrollBarWidth, this.height, mouse.x, mouse.y);
        if (myclickedX == myclickedY) return;
        else if (myclickedX) {
            const barHeight = this.width - (this.scroll.y ? this.scrollBarWidth : 0);
            const scrollBarHeight = (barHeight / this.content.width) * barHeight;
            const newScrollRatio = (mouse.x - this.x - scrollBarHeight / 2) / (barHeight - scrollBarHeight);
            this.scrollPosition.x = Math.max(0, Math.min(newScrollRatio * this.displayWidth, this.displayWidth));
        } else if (myclickedY) {
            const barHeight = this.height - (this.scroll.x ? this.scrollBarWidth : 0);
            const scrollBarHeight = (barHeight / this.content.height) * barHeight;
            const newScrollRatio = (mouse.y - this.y - scrollBarHeight / 2) / (barHeight - scrollBarHeight);
            this.scrollPosition.y = Math.max(0, Math.min(newScrollRatio * this.displayHeight, this.displayHeight));
        }
    };
    drawScrollBarX = (forced = !this.hideScroll) => {
        if (!this.scroll.x) return;
        const barHeight = this.width - (this.scroll.y ? this.scrollBarWidth : 0);
        const scrollBarHeight = (barHeight / this.content.width) * this.width;
        const scrollBarTop = (this.scrollPosition.x / this.displayWidth) * (barHeight - scrollBarHeight);
        const scrollOff = this.height - this.scrollBarWidth;
        if (forced || detectRect(this.x, this.y + scrollOff, this.width, this.scrollBarWidth, mouse.x, mouse.y)) {
            ctx.fillStyle = "#333";
            ctx.globalAlpha = 0.3;
            ctx.fillRect(this.x, this.y + scrollOff, this.width, this.scrollBarWidth);
            ctx.globalAlpha = 0.8;
            ctx.fillRect(this.x + scrollBarTop, this.y + scrollOff, scrollBarHeight, this.scrollBarWidth);
            ctx.globalAlpha = 1;
            if (!forced) this.drawScrollBarY(true);
        }
    };
    drawScrollBarY = (forced = !this.hideScroll) => {
        if (!this.scroll.y) return;
        const barHeight = this.height - (this.scroll.x ? this.scrollBarWidth : 0);
        const scrollBarHeight = (barHeight / this.content.height) * this.height;
        const scrollBarTop = (this.scrollPosition.y / this.displayHeight) * (barHeight - scrollBarHeight);
        const scrollOff = this.width - this.scrollBarWidth;
        if (
            forced ||
            detectRect(this.x + scrollOff, this.y, this.scrollBarWidth, this.heightthis.height, mouse.x, mouse.y)
        ) {
            ctx.fillStyle = "#333";
            ctx.globalAlpha = 0.3;
            ctx.fillRect(this.x + scrollOff, this.y, this.scrollBarWidth, this.height);
            ctx.globalAlpha = 0.8;
            ctx.fillRect(this.x + scrollOff, this.y + scrollBarTop, this.scrollBarWidth, scrollBarHeight);
            ctx.globalAlpha = 1;
            if (!forced) this.drawScrollBarX(true);
        }
    };
    draw = () => {
        this.scrollPosition.x = clamp(this.scrollPosition.x, 0, this.displayWidth);
        this.scrollPosition.y = clamp(this.scrollPosition.y, 0, this.displayHeight);
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = this.background;
        ctx.fill();
        ctx.clip();
        ctx.translate(
            -this.scrollPosition.x - Math.max(0, this.width - this.scrollWidth),
            -this.scrollPosition.y - Math.max(0, this.height - this.scrollHeight)
        );
        this.propagate("draw");
        ctx.restore();
        this.drawScrollBarX();
        this.drawScrollBarY();
    };
    modmouseevent = (e) => {
        const newE = cloneMouseEvent(e);
        newE.mouseX += this.scrollPosition.x;
        newE.mouseY += this.scrollPosition.y;
        return newE;
    };
    shouldinteract = (mX, mY) => detectRect(this.x, this.y, this.scrollWidth, this.scrollHeight, mX, mY);
}
class UIToast extends UIText {
    onshow = () => scheduleTask(() => this.hide(), { time: this.duration });
}
class UI {
    /**
     * Create a Blank UIElement to be used as the base for GUIs.
     * @param {UIOptions} [options] - Additional options
     * @returns {UIElement} - A base UIElement object.
     */
    static Blank = (options) => {
        return new UIElement(0, 0, options);
    };

    /**
     * Create a Rect to be used in UIs.
     * @param {number} x - The x-coordinate of the text.
     * @param {number} y - The y-coordinate of the text.
     * @param {number} width - The width of the rectangle.
     * @param {number} height - The height of the rectangle.
     * @param {RectOptions} [options] - Additional options
     * @returns {UIRect} - A base UIElement object.
     */
    static Rect = (x, y, width, height, options) => {
        return new UIRect(x, y, { width, height, ...options });
    };
    static Circle = (x, y, radius, options) => {
        return new UICircle(x, y, { radius, ...options });
    };

    /**
     * Create a UI Text element to be rendered.
     *
     * @param {string} text - The text to be displayed.
     * @param {number} x - The x-coordinate of the text.
     * @param {number} y - The y-coordinate of the text.
     * @param {TextOptions} [options] - Additional options for Text styling
     * @returns {UIElement} - A text element object.
     */
    static Text = (text, x, y, options = {}) => {
        return new UIText(x, y, { text, ...options });
    };
    /**
     * Create an Image UIElement to be rendered.
     * @param {string} src - The source URL of the image.
     * @param {number} x - The x-coordinate of the image.
     * @param {number} y - The y-coordinate of the image.
     * @param {UIOptions} [options] - Additional options for configuring the UI element.
     * @property {number} [width] - The width of the image.
     * @property {number} [height] - The height of the image.
     * @returns {UIImage} - An Image UIElement object.
     */
    static Image = (src, x, y, { width, height, ...options } = {}) => {
        return new UIImage(x, y, { src, width, height, ...options });
    };
    /**
     * Create a Button UIElement to be rendered.
     *
     * @param {function} onmyclick - The callback function to be executed when the button is myclicked.
     * @param {number} x - The x-coordinate of the button.
     * @param {number} y - The y-coordinate of the button.
     * @param {number} width - The width of the button.
     * @param {number} height - The height of the button.
     * @param {RectOptions} [options] - Additional options for configuring the button.
     * @returns {UIButton} - A Button UIElement object.
     */
    static Button = (onmyclick, x, y, width, height, options) => {
        return new UIRect(x, y, { width, height, onmyclick, ...options });
    };
    /**
     * Create a text input UI element to be rendered.
     *
     * @param {number} x - The x-coordinate of the text input.
     * @param {number} y - The y-coordinate of the text input.
     * @param {TextInputOptions} [options] - Additional options for configuring the text input.
     * @returns {UITextInput} - A text input UI element object.
     */
    static TextInput = (x, y, { placeholder = "", width, oninput, onsubmit, autofocus, ...options } = {}) => {
        return new UITextInput(x, y, {
            width,
            text: "",
            placeholder,
            oninput,
            onsubmit,
            isFocused: !!autofocus,
            ...options,
        });
    };
    static ProgressBar = (getprogress, x, y, width, height, { fill, background, ...options } = {}) => {
        return new UIProgressBar(x, y, {
            width,
            height,
            getprogress,
            fill,
            background,
            ...options,
        });
    };
    static Dialogue = (
        x,
        y,
        width,
        height,
        title,
        message,
        scale,
        { cornerRadius, color, buttonText = "Close", onmyclick, background, ...options } = {}
    ) => {
        const dialogue = new UIDialogue(x, y, {
            width,
            height,
            title,
            message,
            scale,
            cornerRadius,
            color,
            buttonText,
            onmyclick,
            background,
            ...options,
        });
        dialogue.onmyclick ??= () => dialogue.hide();
        return dialogue;
    };
    static Scroll = (
        x,
        y,
        width,
        height,
        {
            scrollWidth = width,
            scrollHeight = height,
            scrollBarWidth = 10,
            hideScroll = false,
            background,
            ...options
        } = {}
    ) => {
        return new UIScroll(x, y, {
            width,
            height,
            scrollWidth,
            scrollHeight,
            scrollBarWidth,
            background,
            hideScroll,
            ...options,
        });
    };
    /**
     * Create a Grid UI element.
     *
     * @param {Array} list - The array of items to display in the list.
     * @param {function(number, any)} createGridItem - Function to create each item in the list.
     * @param {number} x - The x-coordinate of the list.
     * @param {number} y - The y-coordinate of the list.
     * @param {number} width - The width of the list.
     * @param {number} height - The height of the list.
     * @param {ScrollOptions} [options] - Additional options for styling the list
     * @param {number} [verticalPadding] - Vertical padding between list items.
     * @returns {UIScroll} - A UI element object containing all the list items.
     */
    static List = (list, createListItem, x, y, width, height, { verticalPadding = 0, ...options } = {}) => {
        const listItems = [];
        let scrollHeight = 0;
        for (let i = 0; i < list.length; i++) {
            const UIListItem = createListItem(i, list[i]);
            UIListItem.shift(0, scrollHeight + verticalPadding);
            listItems.push(UIListItem);
            scrollHeight += UIListItem.height + verticalPadding;
        }
        const UIList = UI.Scroll(x, y, width, height, { ...options, scrollHeight });
        listItems.forEach((c) => UIList.add(c));
        return UIList;
    };
    /**
     * Creates a Grid UI element.
     *
     * @param {Array} list - The array of items to display in the grid.
     * @param {function(number, any)} createGridItem - Function to create each item in the grid.
     * @param {number} x - The x-coordinate of the grid.
     * @param {number} y - The y-coordinate of the grid.
     * @param {number} width - The width of the grid.
     * @param {number} height - The height of the grid.
     * @param {ScrollOptions} [options] - Additional options for styling the list
     * @param {number} [horizontalPadding] - Horizontal padding between grid items.
     * @param {number} [verticalPadding] - Vertical padding between grid items.
     * @param {number} [gridWidth] - Number of items in each row of the grid.
     * @returns {UIScroll} - A UI element object containing all the grid items.
     */
    static Grid = (
        list,
        createGridItem,
        x,
        y,
        width,
        height,
        { horizontalPadding = 0, verticalPadding = 0, gridWidth, ...options } = {}
    ) => {
        const gridItems = [];
        let currentWidth = horizontalPadding;
        let scrollHeight = verticalPadding;
        let scrollWidth = width;

        for (let i = 0; i < list.length; i++) {
            const UIGridItem = createGridItem(i, list[i]);
            UIGridItem.shift(currentWidth, scrollHeight);
            gridItems.push(UIGridItem);
            scrollWidth = Math.max(scrollWidth, currentWidth);
            currentWidth += UIGridItem.width + horizontalPadding;
            if ((gridWidth && i % gridWidth === 0 && i !== 0) || (!gridWidth && currentWidth > x + width)) {
                UIGridItem.shift(-currentWidth, 0);
                currentWidth = horizontalPadding + UIGridItem.width + horizontalPadding;
                scrollHeight += UIGridItem.height + verticalPadding;
                UIGridItem.shift(currentWidth, UIGridItem.height + verticalPadding);
            }
            if (i == list.length - 1) scrollHeight += UIGridItem.height + verticalPadding;
        }
        const UIGrid = UI.Scroll(x, y, width, height, { ...options, scrollWidth, scrollHeight });
        gridItems.forEach((item) => UIGrid.add(item));

        return UIGrid;
    };
    static Toast = (text, x, y, { duration = 3, ...options } = {}) => {
        new UIToast(x, y, { text, duration, ...options, overlay: true });
    };
    static Popup = (text, x, y, { lerpMovement, duration = 0.4, ...options } = {}) => {
        lerpMovement ??= function (t) {
            this.y -= Math.sin(t * Math.PI);
        };
        const popup = new UIToast(x, y, { text, duration, ...options, overlay: true });
        startLerp(popup, lerpMovement, duration);
        popup.show();
    };
    static colorPath = ({ hovered, fill, stroke, strokeWidth, hoverFill, hoverStroke, hoverWidth } = {}) => {
        ctx.fillStyle = (hovered && hoverFill) || fill;
        if (fill || (hovered && hoverFill)) ctx.fill();
        ctx.lineWidth = (hovered && hoverWidth) || strokeWidth;
        ctx.strokeStyle = (hovered && hoverStroke) || stroke;
        if (stroke || (hovered && hoverStroke)) ctx.stroke();
    };
    static drawRect = (x, y, w, h, options = {}) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, options?.cornerRadius);
        UI.colorPath(options);
        ctx.closePath();
    };
    static drawCircle = (x, y, radius, options = {}) => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        UI.colorPath(options);
        ctx.closePath();
    };
    static drawText = (text, x, y, { width, font, color, center, linewrap } = {}) => {
        if (color) ctx.fillStyle = color;
        if (font) ctx.font = font;
        ctx.textBaseline = center ? "middle" : "alphabetic";

        if (linewrap && width) {
            const words = text.split(" ");
            let currentLine = "";
            let lines = [];

            for (const word of words) {
                const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
                const testWidth = ctx.measureText(testLine).width;

                if (testWidth > width) {
                    lines.push(currentLine);
                    currentLine = word;
                } else currentLine = testLine;
            }

            lines.push(currentLine);

            if (center) y -= (lines.length - 1) * parseInt(ctx.font);

            lines.forEach((line, index) => {
                const centeredX = x - (center ? (ctx.measureText(line).width - width) / 2 : 0);
                ctx.fillText(line, centeredX, y + index * parseInt(ctx.font), width);
            });
        } else {
            const centeredX = x - (center ? (ctx.measureText(text).width - width) / 2 : 0);
            ctx.fillText(text, centeredX, y, width);
        }
    };
    static drawImage = (src, x, y, { width, height } = {}) => {
        drawImage.cache ??= {};
        if (drawImage.cache[src]) return ctx.drawImage(drawImage.cache[src], x, y, width, height);
        const image = new Image();
        image.src = src;
        image.onload = () => {
            ctx.drawImage(image, x, y, width, height);
            drawImage.cache[src] = image;
        };
    };
    static fillScreen = ({ color }) => {
        ctx.save();
        ctx.resetTransform();
        if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EngineLayers.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const LayerManager = new (class LayerManager extends Interactable {
    lastTimestamp;
    ispaused = true;
    layers = [];
    propagate = (call, ...args) => {
        if (!this.global.ispaused) this.global.raise(call, ...args);
        if (!!this.layers.length && !this.currentLayer.ispaused) this.currentLayer.raise(call, ...args);
    };
    get global() {
        return this.layers[-1];
    }
    set global(val) {
        this.layers[-1] = val;
    }
    constructor() {
        super();
        globalThis.onblur = this.pause;
        globalThis.onfocus = this.resume;
        globalThis.onload = () => {
            if (typeof load !== "undefined") load();
            this.resume();
        };
        document.addEventListener("mousedown", this.pageinteract, { once: true });
        document.addEventListener("keydown", this.pageinteract, { once: true });
        // document.addEventListener("contextmenu", (e) => e.preventDefault());
        document.addEventListener("keydown", this.keydown);
        document.addEventListener("keyup", this.keyup);
        document.addEventListener("mousemove", this.mousemove);
        document.addEventListener("mousedown", this.mousedown);
        document.addEventListener("mouseup", this.mouseup);
        document.addEventListener("click", this.click);
        document.addEventListener("dblclick", this.dblclick);
        document.addEventListener("wheel", this.wheel);
    }
    get currentLayer() {
        return this.layers[this.layers.length - 1];
    }
    update = (timestamp) => {
        // Fraction of a second since last update.
        const delta = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        this.propagate("update", delta);
        this.propagate("draw");
        this.updateframe = requestAnimationFrame(this.update);
    };
    getEntities = (group) => this.global.getEntities(group).concat(this.currentLayer.getEntities(group));
    pageinteract = () => {
        document.removeEventListener("mousedown", this.pageinteract, { once: true });
        document.removeEventListener("keydown", this.pageinteract, { once: true });
        this.interacted = true;
        this.propagate("pageinteract");
    };
    pause = () => {
        this.ispaused = true;
        cancelAnimationFrame(this.updateframe);
        this.global.pause();
        this.layers.forEach((l) => l.pause());
    };
    resume = () => {
        this.ispaused = false;
        cancelAnimationFrame(this.updateframe);
        this.lastTimestamp = document.timeline.currentTime;
        this.updateframe = requestAnimationFrame(this.update);
        this.global.resume();
        this.currentLayer?.resume();
    };
    push = (layer) => {
        this.currentLayer?.pause();
        layer.position = this.layers.length;
        layer.parent = this;
        this.layers.push(layer);
        layer.resume();
        return layer;
    };
    pop = () => {
        const layer = this.layers.pop();
        layer?.pause();
        this.currentLayer?.resume();
        this.raise("onremove", layer);
        return layer;
    };
})();

class Layer extends Interactable {
    constructor({ id } = {}, calls = {}) {
        super(id);
        MergeOntoObject(this, calls);
        LayerManager.push(this);
    }
    UIRoot = new UIRoot(this);
    addUI = (child) => this.UIRoot.add(child);
    removeUI = (child) => this.UIRoot.remove(child);
    spacialMap = new SpacialMap(this);
    addEntity = (child) => this.spacialMap.addEntity(child);
    removeEntity = (child) => this.spacialMap.removeEntity(child);
    ispaused = false;
    asyncManager = new AsyncManager();
    scheduleTask = (func, options = {}, ...args) => this.asyncManager.scheduleTask(func, options, ...args);
    findTask = (id) => this.asyncManager.findTask(id);
    clearTask = (id) => this.asyncManager.clearTask(id);
    playSoundEffect = (source, options = {}) => this.asyncManager.playSoundEffect(source, options);
    playMusic = (source, options = {}) => this.asyncManager.playMusic(source, options);
    // Base Methods
    open = () => this.propagate("open");
    close = () => this.propagate("close");
    // Gameplay Methods
    cameraX;
    cameraY;
    scaleX;
    scaleY;
    updateRate = 0;
    propagate = (call, ...args) => {
        this.raise("on" + call, ...args);
        this.UIRoot.raise(call, ...args);
        this.asyncManager.raise(call, ...args);
        this.spacialMap.raise(call, ...args);
    };
    // Game Update Events
    update = (delta) => {
        if (this.deltaMod) delta *= this.deltaMod;
        if (!this.tickRate) this.propagate("update", delta);
        else {
            this.update.accumulatedTime ??= 0;
            this.update.accumulatedTime += delta;
            while (this.update.accumulatedTime >= this.tickRate) {
                this.update.accumulatedTime -= this.tickRate;
                this.propagate("update", this.tickRate);
            }
        }
    };
    draw = () => {
        ctx.save();
        this.raise("ondraw");
        this.UIRoot.raise("draw");
        if (this.cameraX !== undefined && this.cameraY !== undefined) {
            if (this.pixelPerfect) {
                this.cameraX = Math.round(this.cameraX);
                this.cameraY = Math.round(this.cameraY);
            }
            ctx.translate(game.width / 2 - this.cameraX, game.height / 2 - this.cameraY);
        }
        if (this.scaleX && this.scaleY) ctx.scale(this.scaleX, this.scaleY);
        this.spacialMap.raise("draw");
        ctx.restore();
    };
    getEntities = (type) => this.spacialMap.getEntities(type);
}

const global = (LayerManager.global = new (class GlobalLayer extends Layer {
    settings = {};
    constructor() {
        super({ layerNum: -1, id: "global" });
        this.position = -1;
        this.parent = LayerManager;
        this.parent.pop();
    }
    keydown = (e) => {
        keys[e.code] = true;
        if (typeof DownKeyEvents !== "undefined") for (let a in DownKeyEvents) if (e.code == a) DownKeyEvents[a]();
        this.propagate("keydown", e);
    };
    keyup = (e) => {
        keys[e.code] = false;
        if (typeof UpKeyEvents !== "undefined") for (let a in UpKeyEvents) if (e.code == a) UpKeyEvents[a]();
        this.propagate("keyup", e);
    };
    mousedown = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Down) MouseEvents.Down(e);
        this.propagate("mousedown", e);
    };
    mouseup = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Up) MouseEvents.Up(e);
        this.propagate("mouseup", e);
    };
    mousemove = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Move) MouseEvents.Move(e);
        this.propagate("mousemove", e);
    };
    click = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Click) MouseEvents.Click(e);
        this.propagate("click", e);
    };
    dblclick = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.DblClick) MouseEvents.DblClick(e);
        this.propagate("dblclick", e);
    };
    wheel = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Wheel) MouseEvents.Wheel(e);
        this.propagate("wheel", e);
    };
    setMousePos = (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        e.mouseX = mouse.x;
        e.mouseY = mouse.y;
        e.canvasX = mouse.x;
        e.canvasY = mouse.y;
    };
})());

/**
 * Represents the main game layer in the application.
 * @extends Layer
 * @class
 */
const game = new (class GameLayer extends Layer {
    /**
     * Constructs a new instance of the GameLayer class.
     */
    constructor() {
        super({ id: "game" });
    }
    /**
     * Clears the screen and fills it with the specified background color.
     * @type {function}
     */
    ondraw = () => {
        UI.fillScreen({ color: this.background });
    };
    /**
     * Get the width of the game.
     * @type {number}
     */
    get width() {
        return canvas.width / (this.scaleX ?? 1);
    }
    /**
     * Set the width of the game.
     * @type {number}
     */
    set width(value) {
        canvas.width = value * (this.scaleX ?? 1);
    }
    /**
     * Get the height of the game.
     * @type {number}
     */
    get height() {
        return canvas.height / (this.scaleY ?? 1);
    }
    /**
     * Set the height of the game.
     * @type {number}
     */
    set height(value) {
        canvas.height = value * (this.scaleY ?? 1);
    }
})();
