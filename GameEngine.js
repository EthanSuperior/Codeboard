// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// This Engine was made by Evan Chase with help from Brandon Graham
// For the BYU Game Dev Club.
// For fair use under the CC0 lincense which states that this is
// under public domain
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// CONTRACTED OBJECTS
// MouseEvents = {Up:Function,Move:Function,Down:Function}
// UpKeyEvents = {KeyCode:Function}
// DownKeyEvents = {KeyCode:Function}
// CONTRACTED FUNCTIONS
// load()
// updateGame(delta)

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CORE VARIABLES
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
const keys = {};
const mouse = { x: 0, y: 0 };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// SOUND FUNCTIONS - https://sfxr.me/
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

playSoundEffect = (source, options) => {
    if (options?.global) return LayerManager.global.playSoundEffect(source, options);
    else return LayerManager.currentLayer.playSoundEffect(source, options);
};

playMusic = (source, options) => {
    if (options?.global) return LayerManager.global.playMusic(source, options);
    else return LayerManager.currentLayer.playMusic(source, options);
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// TIMING FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
// UTILITY FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function detectRect(x, y, w, h, ptX, ptY) {
    return ptX >= x && ptX <= x + w && ptY >= y && ptY <= y + h;
}
function detectCircle(x, y, r, ptX, ptY) {
    return Math.hypot(ptX - x, ptY - y) <= r;
}
function detectEntity(entityOne, entityTwo, radius) {
    radius ??= (entityOne.size + entityTwo.size) / 2;
    return distanceTo(entityOne, entityTwo) <= radius;
}
function outOfBounds(entity, { padding } = {}) {
    if (padding === undefined) padding = entity.size ?? 0;
    return (
        entity.y < -padding ||
        entity.y > canvas.height + padding ||
        entity.x < -padding ||
        entity.x > canvas.width + padding
    );
}
function distanceTo(from, to) {
    return Math.hypot(from.x - to.x, from.y - to.y);
}
function angleTo(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}
function getPlayerMovementDirection({ useCardinal } = {}) {
    let dir = null;

    // Check for horizontal movement
    if ((keys["ArrowLeft"] || keys["KeyA"]) && !(keys["ArrowRight"] || keys["KeyD"])) {
        dir = Math.PI; // Left
    } else if ((keys["ArrowRight"] || keys["KeyD"]) && !(keys["ArrowLeft"] || keys["KeyA"])) {
        dir = 0; // Right
    }

    // Check for vertical movement
    if ((keys["ArrowUp"] || keys["KeyW"]) && !(keys["ArrowDown"] || keys["KeyS"])) {
        dir = -Math.PI / 2; // Up
    } else if ((keys["ArrowDown"] || keys["KeyS"]) && !(keys["ArrowUp"] || keys["KeyW"])) {
        dir = Math.PI / 2; // Down
    }

    if (useCardinal) return dir;

    // Adjust for diagonals
    if ((keys["ArrowUp"] || keys["KeyW"]) && (keys["ArrowLeft"] || keys["KeyA"])) {
        dir = (-3 * Math.PI) / 4; // Up-Left
    }
    if ((keys["ArrowUp"] || keys["KeyW"]) && (keys["ArrowRight"] || keys["KeyD"])) {
        dir = -Math.PI / 4; // Up-Right
    }
    if ((keys["ArrowDown"] || keys["KeyS"]) && (keys["ArrowLeft"] || keys["KeyA"])) {
        dir = (3 * Math.PI) / 4; // Down-Left
    }
    if ((keys["ArrowDown"] || keys["KeyS"]) && (keys["ArrowRight"] || keys["KeyD"])) {
        dir = Math.PI / 4; // Down-Right
    }

    return dir;
}
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
const lerp = (start, end, progress) => start + progress * (end - start);
function startLerp(obj, lerpFunc, duration, { layer } = {}) {
    Entity.types["Lerp"] ??= { group: [] };
    const lerpEntity = new Entity();
    lerpEntity.currentTime = 0;
    lerpEntity.groupName = "Lerp";
    lerpEntity.onupdate = (delta) => {
        lerpEntity.currentTime += delta;
        progress = clamp(lerpEntity.currentTime / duration, 0, 1);
        lerpFunc.call(obj, progress);
        if (progress == 1) lerpEntity.despawn();
    };
    layer ??= LayerManager.currentLayer;
    lerpEntity.layer = layer;
    layer.addEntity(lerpEntity);
    Entity.types["Lerp"].group.push(lerpEntity);
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

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CLASS DEFINITIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

class Identifiable {
    constructor(id) {
        this.id = id || crypto.randomUUID();
    }
    raise = (call, ...args) => this[call] && this[call].call(this, ...args);
}
class Interactable extends Identifiable {
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
    propigate = (call, ...args) => {
        this.raise("on" + call, ...args);
        this.children.forEach((c) => c.raise(call, ...args));
    };
    update = (delta) => this.propigate("update", delta);
    interact = () => this.propigate("interact");
    // IO Events
    keydown = (e) => this.propigate("keydown", e);
    keyup = (e) => this.propigate("keyup", e);
    // Mouse IO Events
    mousedown = (e) => this.propigate("mousedown", e);
    mouseup = (e) => this.propigate("mouseup", e);
    mousemove = (e) => this.propigate("mousemove", e);
    click = (e) => this.propigate("click", e);
    dblclick = (e) => this.propigate("dblclick", e);
    wheel = (e) => this.propigate("wheel", e);
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
class LayerManager extends Interactable {
    static instance = new LayerManager("LayerManager");
    static lastTimestamp;
    static global;
    static ispaused = true;
    propigate = (call, ...args) => {
        if (!LayerManager.global.ispaused) LayerManager.global.raise(call, ...args);
        if (!LayerManager.currentLayer.ispaused) LayerManager.currentLayer.raise(call, ...args);
    };
    static get children() {
        return LayerManager.instance.children;
    }
    static get propigate() {
        return LayerManager.instance.propigate;
    }
    static {
        function registerListener(eventName) {
            document.addEventListener(eventName, LayerManager.instance[eventName]);
        }
        window.onblur = LayerManager.pause;
        window.onfocus = LayerManager.resume;
        window.onload = () => {
            if (typeof load !== "undefined") load();
            LayerManager.resume();
        };
        document.addEventListener("mousedown", LayerManager.oninteract, { once: true });
        document.addEventListener("keydown", LayerManager.oninteract, { once: true });
        // document.addEventListener("contextmenu", (e) => e.preventDefault());
        registerListener("keydown");
        registerListener("keyup");
        registerListener("mousemove");
        registerListener("mousedown");
        registerListener("mouseup");
        registerListener("click");
        registerListener("dblclick");
        registerListener("wheel");
    }
    static get currentLayer() {
        return LayerManager.children[LayerManager.children.length - 1];
    }
    static update = (timestamp) => {
        // Fraction of a second since last update.
        const delta = (timestamp - LayerManager.lastTimestamp) / 1000;
        LayerManager.lastTimestamp = timestamp;
        LayerManager.propigate("update", delta);
        LayerManager.propigate("draw");
        LayerManager.updateframe = requestAnimationFrame(LayerManager.update);
    };
    static oninteract() {
        document.removeEventListener("mousedown", LayerManager.oninteract, { once: true });
        document.removeEventListener("keydown", LayerManager.oninteract, { once: true });
        LayerManager.interacted = true;
        LayerManager.propigate("interact");
    }
    static pause() {
        LayerManager.ispaused = true;
        cancelAnimationFrame(LayerManager.updateframe);
        LayerManager.global.pause();
        LayerManager.children.forEach((l) => l.pause());
    }
    static resume() {
        LayerManager.ispaused = false;
        cancelAnimationFrame(LayerManager.updateframe);
        LayerManager.lastTimestamp = document.timeline.currentTime;
        LayerManager.updateframe = requestAnimationFrame(LayerManager.update);
        LayerManager.global.resume();
        LayerManager.currentLayer?.resume();
    }
    static registerLayer(layer) {
        LayerManager.currentLayer?.pause();
        LayerManager.instance.add(layer);
        layer.resume();
    }
    static unregisterLayer(layer) {
        layer.pause();
        LayerManager.instance.remove(layer.id);
        LayerManager.currentLayer?.resume();
    }
}
class Layer extends Interactable {
    constructor({ id, layerNum } = {}, calls = {}) {
        super(id);
        this.entities = { Entity: new IterableWeakRef() };
        for (let v in Entity.types) this.entities[v] = new IterableWeakRef();
        this.layerNum = layerNum;
        for (let key in calls) this[key] = calls[key];
    }
    // Base Methods
    open = () => this.propigate("open");
    close = () => this.propigate("close");
    // Timing Methods
    tasks = [];
    ispaused = false;
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
        if (!LayerManager.interacted) return (this.interact = () => this.playMusic(source, options));
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
    // Gameplay Methods
    cameraX;
    cameraY;
    scaleX;
    scaleY;
    updateRate = 0;
    addEntity = (entity) => {
        this.entities[entity.groupName] ??= new IterableWeakRef();
        this.entities[entity.groupName].push(entity);
    };
    removeEntity = (entity) => {
        this.entities[entity.groupName]?.remove(entity.id);
    };
    propigate = (call, ...args) => {
        this.raise("on" + call, ...args);
        this.children.forEach((c) => c.raise(call, ...args));
        for (let v in Entity.types) {
            this.entities[v] ??= new IterableWeakRef();
            this.entities[v].forEach((e) => e.raise(call, ...args));
        }
    };
    // Game Update Events
    draw = () => {
        this.raise("ondraw");
        this.children.forEach((c) => c.raise("draw"));
        ctx.save();
        if (this.cameraX !== undefined && this.cameraY !== undefined)
            ctx.translate(canvas.width / 2 - this.cameraX, canvas.height / 2 - this.cameraY);
        if (this.scaleX && this.scaleY) ctx.scale(this.scaleX, this.scaleY);
        for (let v in Entity.types) {
            this.entities[v] ??= new IterableWeakRef();
            this.entities[v].forEach((e) => e.raise("draw"));
        }
        ctx.restore();
    };
}
class GlobalLayer extends Layer {
    constructor() {
        super({ layerNum: null, id: "global" });
    }
    keydown = (e) => {
        keys[e.code] = true;
        if (typeof DownKeyEvents !== "undefined") for (let a in DownKeyEvents) if (e.code == a) DownKeyEvents[a]();
        this.propigate("keydown", e);
    };
    keyup = (e) => {
        keys[e.code] = false;
        if (typeof UpKeyEvents !== "undefined") for (let a in UpKeyEvents) if (e.code == a) UpKeyEvents[a]();
        this.propigate("keyup", e);
    };
    mousedown = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Down) MouseEvents.Down(e);
        this.propigate("mousedown", e);
    };
    mouseup = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Up) MouseEvents.Up(e);
        this.propigate("mouseup", e);
    };
    mousemove = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Move) MouseEvents.Move(e);
        this.propigate("mousemove", e);
    };
    click = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Click) MouseEvents.Click(e);
        this.propigate("click", e);
    };
    dblclick = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.DblClick) MouseEvents.DblClick(e);
        this.propigate("dblclick", e);
    };
    wheel = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Wheel) MouseEvents.Wheel(e);
        this.propigate("wheel", e);
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
class UIElement extends Interactable {
    children = [];
    constructor(x, y, options) {
        super(options.id);
        this.x = x;
        this.y = y;
        this.options = options;
        for (let v in options)
            Object.defineProperty(this, v, {
                set(val) {
                    this.options[v] = val;
                },
                get() {
                    return this.options[v];
                },
            });
    }
    draw = () => this.propigate("draw");
    mousedown = (e) => {
        if (this.detect(e.mouseX, e.mouseY)) this.propigate("mousedown", e);
    };
    mousemove = (e) => {
        if (this.options) this.options.hovered = this.detect(e.mouseX, e.mouseY);
        this.propigate("mousemove", e);
    };
    click = (e) => {
        if (this.detect(e.mouseX, e.mouseY)) this.propigate("click", e);
    };
    show = ({ overlay } = {}) => {
        if (overlay) this.layerNum = LayerManager.activeLayer;
        else LayerManager.registerLayer(new Layer());
        LayerManager.currentLayer.add(this);
        this.layer = this.parent;
        this.parent = null;
    };
    detect = (mX, mY) => true;
    hide = () => {
        if (!this.parent) LayerManager.unregisterLayer(this.layer);
        this.propigate("hide");
    };
    onadd = (ui) => {
        ui.shift(this.x, this.y);
    };
    shift = (x, y) => {
        this.x += x;
        this.y += y;
        this.propigate("shift", x, y);
    };
}
class UI {
    static Base = (x = 0, y = 0, options = {}) => {
        return new UIElement(x, y, options);
    };
    static Blank = (options) => {
        return new UIElement(0, 0, options);
    };
    static Rect = (x, y, width, height, { cornerRadius, ...options } = {}) => {
        UI.Rect.classRef ??= class UIRect extends UIElement {
            ondraw = () => UI.drawRect(this.x, this.y, this.width, this.height, this.options);
            detect = (mX, mY) => detectRect(this.x, this.y, this.width, this.height, mX, mY);
        };
        return new UI.Rect.classRef(x, y, { width, height, cornerRadius, ...options });
    };
    static Circle = (x, y, radius, options = {}) => {
        UI.Circle.classRef ??= class UICircle extends UIElement {
            ondraw = () => UI.drawCircle(this.x, this.y, this.radius, this.options);
            detect = (mX, mY) => detectCircle(this.x, this.y, this.radius, mX, mY);
        };
        return new UI.Circle.classRef(x, y, { radius, ...options });
    };
    static Text = (text, x, y, { width, font, color, center, linewrap, ...options } = {}) => {
        UI.Text.classRef ??= class UIText extends UIElement {
            ondraw = () => UI.drawText(this.text, this.x, this.y, this.options);
        };
        return new UI.Text.classRef(x, y, { text, width, font, color, center, linewrap, ...options });
    };
    static Image = (src, x, y, { width, height, ...options } = {}) => {
        UI.Image.classRef ??= class UIImage extends UIElement {
            ondraw = () => UI.drawImage(this.src, this.x, this.y, this.options);
        };
        return new UI.Image.classRef(x, y, { src, width, height, ...options });
    };
    static Button = (onclick, x, y, width, height, { cornerRadius, ...options } = {}) => {
        UI.Button.classRef ??= class UIButton extends UI.Rect.classRef {};
        return new UI.Button.classRef(x, y, { width, height, onclick, cornerRadius, ...options });
    };
    static TextInput = (x, y, { placeholder = "", width, oninput, onsubmit, autofocus, ...options } = {}) => {
        UI.TextInput.classRef ??= class UITextInput extends UIElement {
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
            click = (e) => {
                this.isFocused = this.detect(e.mouseX, e.mouseY);
            };

            ondraw = () => {
                if (this.font) ctx.font = this.font;
                const fontSize = parseInt(ctx.font);
                // Draw the input box
                ctx.clearRect(this.x, this.y, this.width, fontSize);
                UI.drawRect(this.x, this.y, this.width, fontSize, { stroke: "black" });
                // Draw the text inside the input box
                ctx.textBaseline = "middle";
                if (this.color) ctx.fillStyle = this.color;
                ctx.textBaseline = "middle";
                ctx.fillText(this.text, this.x, this.y + fontSize / 2, this.width);
            };
            detect = (mX, mY) =>
                detectRect(this.x, this.y, this.width, parseInt(this.font ? this.font : ctx.font), mX, mY);
        };
        return new UI.TextInput.classRef(x, y, {
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
        UI.ProgressBar.classRef ??= class UIProgressBar extends UIElement {
            get progress() {
                return this.getprogress();
            }
            ondraw = () => {
                // Draw the background
                if (this.background) {
                    ctx.fillStyle = this.background;
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }

                // Draw the progress bar
                if (this.fill) {
                    ctx.fillStyle = this.fill;
                    ctx.fillRect(this.x, this.y, this.progress * this.width, this.height);
                }
            };
        };
        return new UI.ProgressBar.classRef(x, y, {
            width,
            height,
            getprogress,
            fill,
            background,
            ...options,
        });
    };
    static Popup = (
        x,
        y,
        width,
        height,
        title,
        message,
        scale,
        { cornerRadius, color, buttonText = "Close", onclick, background, ...options } = {}
    ) => {
        UI.Popup.classRef ??= class UIPopup extends UIElement {
            detect = (mX, mY) =>
                detectRect(
                    this.x + this.scale / 2,
                    this.y + this.height - this.scale - this.scale / 2,
                    this.width - this.scale,
                    this.scale,
                    mX,
                    mY
                );
            ondraw = () => {
                UI.drawRect(this.x, this.y, this.width, this.height, { ...this.options, fill: this.background });
                UI.drawText(this.title, this.x, this.y + this.scale, {
                    center: true,
                    font: `bold ${scale}px monospace`,
                    ...this.options,
                });
                UI.drawText(this.message, this.x, this.y + this.scale + this.scale, {
                    font: `bold ${this.scale / 2}px monospace`,
                    center: true,
                    ...this.options,
                });
                UI.drawRect(
                    this.x + this.scale / 2,
                    this.y + this.height - this.scale - this.scale / 2,
                    this.width - this.scale,
                    this.scale,
                    this.options
                );
                UI.drawText(this.buttonText, this.x, this.y + this.height - this.scale, {
                    font: `bold ${this.scale * 0.75}px monospace`,
                    center: true,
                    ...this.options,
                });
            };
        };
        const popup = new UI.Popup.classRef(x, y, {
            width,
            height,
            title,
            message,
            scale,
            cornerRadius,
            color,
            buttonText,
            onclick,
            background,
            ...options,
        });
        popup.onclick ??= () => popup.hide();
        return popup;
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
            background = "#000",
            hideScroll = false,
            ...options
        } = {}
    ) => {
        UI.Scroll.classRef ??= class UIScroll extends UIElement {
            content = { width: this.scrollWidth, height: this.scrollHeight };
            scroll = { x: !!(this.width < this.scrollWidth), y: !!(this.height < this.scrollHeight) };
            scrollPosition = { x: 0, y: 0 };
            displayWidth = this.scrollWidth - this.width;
            displayHeight = this.scrollHeight - this.height;
            onwheel = (e) => {
                this.scrollPosition.x = clamp(this.scrollPosition.x + e.deltaX, 0, this.displayWidth);
                this.scrollPosition.y = clamp(this.scrollPosition.y + e.deltaY, 0, this.displayHeight);
                this.mousemove(e);
            };
            onmousedown = (e) => {
                this.scrolling = true;
                this.jumpscroll();
            };
            onmouseup = (e) => {
                this.jumpscroll();
                this.scrolling = false;
            };
            onmousemove = (e) => {
                this.jumpscroll();
            };
            jumpscroll = () => {
                if (!this.scrolling) return;
                const clickedX =
                    this.scroll.x &&
                    detectRect(
                        x,
                        y + this.height - this.scrollBarWidth,
                        this.width,
                        this.scrollBarWidth,
                        mouse.x,
                        mouse.y
                    );
                const clickedY =
                    this.scroll.y &&
                    detectRect(
                        x + this.width - this.scrollBarWidth,
                        y,
                        this.scrollBarWidth,
                        this.height,
                        mouse.x,
                        mouse.y
                    );
                if (clickedX == clickedY) return;
                else if (clickedX) {
                    const barHeight = this.width - (this.scroll.y ? this.scrollBarWidth : 0);
                    const scrollBarHeight = (barHeight / this.content.width) * barHeight;
                    const newScrollRatio = (mouse.x - this.x - scrollBarHeight / 2) / (barHeight - scrollBarHeight);
                    this.scrollPosition.x = Math.max(
                        0,
                        Math.min(newScrollRatio * this.displayWidth, this.displayWidth)
                    );
                } else if (clickedY) {
                    const barHeight = this.height - (this.scroll.x ? this.scrollBarWidth : 0);
                    const scrollBarHeight = (barHeight / this.content.height) * barHeight;
                    const newScrollRatio = (mouse.y - this.y - scrollBarHeight / 2) / (barHeight - scrollBarHeight);
                    this.scrollPosition.y = Math.max(
                        0,
                        Math.min(newScrollRatio * this.displayHeight, this.displayHeight)
                    );
                }
            };
            drawScrollBarX = (forced = !this.hideScroll) => {
                if (!this.scroll.x) return;
                const barHeight = this.width - (this.scroll.y ? this.scrollBarWidth : 0);
                const scrollBarHeight = (barHeight / this.content.width) * this.width;
                const scrollBarTop = (this.scrollPosition.x / this.displayWidth) * (barHeight - scrollBarHeight);
                const scrollOff = this.height - this.scrollBarWidth;
                if (
                    forced ||
                    detectRect(this.x, this.y + scrollOff, this.width, this.scrollBarWidth, mouse.x, mouse.y)
                ) {
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
                    detectRect(
                        this.x + scrollOff,
                        this.y,
                        this.scrollBarWidth,
                        this.heightthis.height,
                        mouse.x,
                        mouse.y
                    )
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
                this.propigate("draw");
                ctx.restore();
                this.drawScrollBarX();
                this.drawScrollBarY();
            };
            mousedown = (e) => {
                const newE = cloneMouseEvent(e);
                newE.mouseX += this.scrollPosition.x;
                newE.mouseY += this.scrollPosition.y;
                if (this.detect(newE.mouseX, newE.mouseY)) this.propigate("mousedown", newE);
            };
            mousemove = (e) => {
                const newE = cloneMouseEvent(e);
                newE.mouseX += this.scrollPosition.x;
                newE.mouseY += this.scrollPosition.y;
                if (this.options) this.options.hovered = this.detect(newE.mouseX, newE.mouseY);
                this.propigate("mousemove", newE);
            };
            click = (e) => {
                const newE = cloneMouseEvent(e);
                newE.mouseX += this.scrollPosition.x;
                newE.mouseY += this.scrollPosition.y;
                if (this.detect(newE.mouseX, newE.mouseY)) this.propigate("click", newE);
            };
            detect = (mX, mY) => detectRect(this.x, this.y, this.scrollWidth, this.scrollHeight, mX, mY);
        };
        return new UI.Scroll.classRef(x, y, {
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
    static List = (list, createListItem, x, y, width, height, verticalPadding, { ...options } = {}) => {
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
    static Grid = (
        list,
        createGridItem,
        x,
        y,
        width,
        height,
        horizontalPadding,
        verticalPadding,
        { gridWidth, ...options } = {}
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
        UI.drawImage.cache ??= {};
        if (UI.drawImage.cache[src]) return ctx.drawImage(UI.drawImage.cache[src], x, y, width, height);
        const image = new Image();
        image.src = src;
        image.onload = () => {
            ctx.drawImage(image, x, y, width, height);
            UI.drawImage.cache[src] = image;
        };
    };
    static fillScreen = ({ color }) => {
        ctx.save();
        ctx.resetTransform();
        if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, game.width, game.height);
        } else ctx.clearRect(0, 0, game.width, game.height);
        ctx.restore();
    };
}
class Entity extends Identifiable {
    static types = {};
    constructor({ layerNum } = {}) {
        super();
        this.x = 0;
        this.y = 0;
        this.size = 0;
        this.dir = 0;
        this.speed = 0;
        this.exp = 0;
        this.neededXP = 0;
        this.level = 0;
        this.staticX = false;
        this.staticY = false;
        this.groupName = "Entity";
        if (layerNum) LayerManager.get(layerNum);
    }
    update = (delta) => {
        if (this.acceleration) this.speed = clamp(this.speed + this.acceleration, 0, this.maxSpeed);
        this.raise("onupdate", delta);
        if (this.speed && this.dir !== null && this.dir !== undefined) {
            if (!this.staticX) this.x += Math.cos(this.dir) * this.speed * delta;
            if (!this.staticY) this.y += Math.sin(this.dir) * this.speed * delta;
        }
        if (this.collisions) this.checkCollision();
    };
    checkCollision = () => {
        for (let group of this.collisions) {
            for (let e of Entity.types[group].group) {
                if (group === this.groupName && e.id === this.id) continue;
                if (this.distanceTo(e) <= (this.size + e.size) / 2) this.raise("collide", e);
            }
        }
    };
    collide = (other) => this.raise("oncollide", other);
    spawn = () => {
        if (this.acceleration) this.maxSpeed ??= this.speed;
        if (this.hp) this.maxHP ??= this.hp;
        this.raise("onspawn");
    };
    do = (func, ...args) => func.call(this, ...args);
    draw = () => {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.rotate) ctx.rotate(this.dir + Math.PI / 2 + (this.rotationalOffset ?? 0));
        const halfSize = this.size / 2;
        if (this.img) {
            ctx.save();
            ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
            UI.drawImage(this.img, -halfSize, -halfSize, { width: this.size, height: this.size });
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
    despawn = () => despawnEntity(this);
    angleTowards = (entity) => {
        this.dir = angleTo(this, entity);
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
    set velocityX(value) {
        const velY = this.velocityY;
        if (this.acceleration) this.speed = Math.hypot(value, velY);
        this.dir = Math.atan2(velY, value);
    }
    get velocityX() {
        return this.speed * Math.cos(this.dir);
    }
    get velocityXSign() {
        return Math.abs(this.velocityX) < 1e-10 ? 0 : Math.sign(this.velocityX);
    }
    set velocityY(value) {
        const velX = this.velocityX;
        if (this.acceleration) this.speed = Math.hypot(velX, value);
        this.dir = Math.atan2(value, velX);
    }
    get velocityY() {
        return this.speed * Math.sin(this.dir);
    }
    get velocityYSign() {
        return Math.abs(this.velocityY) < 1e-10 ? 0 : Math.sign(this.velocityY);
    }
}
class GameLayer extends Layer {
    constructor() {
        super({ id: "game" });
    }
    ondraw = () => {
        UI.fillScreen({ color: this.background });
    };
    get width() {
        return canvas.width;
    }
    set width(value) {
        canvas.width = value;
    }
    get height() {
        return canvas.height;
    }
    set height(value) {
        canvas.height = value;
    }
}
function registerEntity(name, options, types) {
    const upperName = name[0].toUpperCase() + name.slice(1);
    const lowerName = name[0].toLowerCase() + name.slice(1);
    const newSubclass = class extends Entity {
        static group = [];
        static get subtypes() {
            return types;
        }
        static set subtypes(value) {
            types = value;
        }
        groupName = name;
    };
    newSubclass.prototype.groupName = name;
    Object.defineProperty(globalThis, lowerName + "Group", {
        get() {
            return newSubclass.group;
        },
        set(value) {
            newSubclass.group = value;
        },
    });
    globalThis["spawn" + upperName] = (subType, additional) => {
        const newEntity = new newSubclass();
        Object.assign(newEntity, options);
        Object.assign(newEntity, subType);
        Object.assign(newEntity, additional);

        Object.keys(newEntity).forEach((key) => {
            if (key.startsWith("on")) {
                const eventName = key.substring(2); // Remove "on" prefix
                if (!newEntity[eventName])
                    newEntity[eventName] = function (...args) {
                        this.raise(key, ...args);
                    }.bind(newEntity);
            }
        });

        globalThis[lowerName + "Group"].push(newEntity);
        newEntity.layer = LayerManager.currentLayer;
        newEntity.layer.addEntity(newEntity);
        newEntity.raise("spawn");
        if (newEntity.lifespan)
            newEntity.lifeTimer = scheduleTask(() => newEntity.despawn(), { time: newEntity.lifespan });
        return newEntity;
    };
    globalThis["forEvery" + upperName + "Do"] = (func, ...args) => {
        for (let i = newSubclass.group.length - 1; i >= 0; i--) newSubclass.group[i]?.do(func, ...args);
    };
    if (types) {
        for (let type in types) types[type].type = type;
        globalThis[lowerName + "Types"] = types;
        globalThis["forEvery" + upperName + "TypeDo"] = (func, ...args) => {
            for (let type in newSubclass.subtypes) func.call(newSubclass.subtypes[type], ...args);
        };
    }
    Entity.types[name] = newSubclass;
}
function despawnEntity(entity) {
    if (!entity) return;
    entity.raise("ondespawn");
    if (entity.lifeTimer) clearTask(entity.lifeTimer);
    const idx = Entity.types[entity.groupName].group.findIndex((e) => e.id === entity.id);
    if (idx == -1) return;
    Entity.types[entity.groupName].group.splice(idx, 1);
    entity.layer.removeEntity(entity);
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
        if (other.velocityXSign === 1) {
            other.x = thisLeft - other.size / 2;
            other.velocityX = 0;
        } else if (other.velocityXSign === -1) {
            other.x = thisRight + other.size / 2;
            other.velocityX = 0;
        }
    }
    if (yOverlap) {
        if (other.velocityYSign === 1) {
            other.y = thisTop - other.size / 2;
            other.velocityY = 0;
        } else if (other.velocityYSign === -1) {
            other.y = thisBottom + other.size / 2;
            other.velocityY = 0;
        }
    }
}

const global = (LayerManager.global = new GlobalLayer());

const game = new GameLayer();

LayerManager.registerLayer(game);

// TODO LIST:
// Finish onboxcollide and make oncirclecollide
// Check how to make events not bubble down all UI layers, but be consumed by things like btns etc. (double scroll etc)
//   Check with console.log to see what onX's are actually being called, maybe a break or something in propigate for those?
// Make Vector class?
// Layer -> Tick Rate (copy lerp wait code?)
// Pixel Perfect -> Entity flag round x and y
// Player Class
// Save Player Class Data
// Level System?
// Add Animations and .frames =>not lerp and playAnimation() => lerp/task
// Add comments && doc strings
// Add Example Template
// Add Platformer and Tile Template
//   https://www.freecodecamp.org/news/learning-javascript-by-making-a-game-4aca51ad9030/
//   https://jobtalle.com/2d_platformer_physics.html
//   https://www.educative.io/answers/how-to-make-a-simple-platformer-using-javascript
//   https://eloquentjavascript.net/15_event.html
