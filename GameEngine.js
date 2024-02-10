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
// UI ELEMENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const makeUI = (id) => new UI({ id });

function UIButton(
    x,
    y,
    width,
    height,
    action,
    { radius = 0, fill, stroke, strokeWidth, hoverFill, hoverStroke, hoverWidth } = {}
) {
    const uiElem = UIRect(x, y, width, height, {
        radius,
        fill,
        stroke,
        strokeWidth,
        hoverFill,
        hoverStroke,
        hoverWidth,
    });
    uiElem.detect = (mX, mY) => detectRect(uiElem.x, uiElem.y, uiElem.width, uiElem.height, mX, mY);
    uiElem.action = action;
    return uiElem;
}

function UIText(text, x, y, { width, font, color, center } = {}) {
    const uiElem = {
        ...{ text, x, y, width, font, color, center },
        draw: () => {
            if (color) ctx.fillStyle = uiElem.color;
            if (font) ctx.font = uiElem.font;
            ctx.textBaseline = uiElem.center ? "middle" : "alphabetic";

            const centeredX = uiElem.x - (uiElem.center ? (ctx.measureText(uiElem.text).width - uiElem.width) / 2 : 0);
            ctx.fillText(uiElem.text, centeredX, uiElem.y, uiElem.width);
        },
    };

    return uiElem;
}

function UICircle(x, y, radius, { fill, stroke, strokeWidth, hoverFill, hoverStroke, hoverWidth } = {}) {
    const uiElem = {
        ...{ x, y, radius, fill, stroke, strokeWidth, hoverFill, hoverStroke, hoverWidth },
        draw: () => {
            ctx.beginPath();
            ctx.arc(uiElem.x, uiElem.y, uiElem.radius, 0, 2 * Math.PI);
            const hovered = ctx.isPointInPath(mouse.x, mouse.y);
            ctx.fillStyle = (hovered && uiElem.hoverFill) || uiElem.fill;
            if (uiElem.fill || (hovered && uiElem.hoverFill)) ctx.fill();
            ctx.lineWidth = (hovered && uiElem.hoverWidth) || uiElem.strokeWidth;
            ctx.strokeStyle = (hovered && uiElem.hoverStroke) || uiElem.stroke;
            if (uiElem.stroke || (hovered && uiElem.hoverStroke)) ctx.stroke();
            ctx.closePath();
        },
    };
    return uiElem;
}

function UIRect(
    x,
    y,
    width,
    height,
    { radius = 0, fill, stroke, strokeWidth, hoverFill, hoverStroke, hoverWidth } = {}
) {
    const uiElem = {
        ...{ x, y, width, height, radius, fill, stroke, strokeWidth, hoverFill, hoverStroke, hoverWidth },
        draw: () => {
            ctx.beginPath();
            ctx.roundRect(uiElem.x, uiElem.y, uiElem.width, uiElem.height, uiElem.radius);
            const hovered = ctx.isPointInPath(mouse.x, mouse.y);
            ctx.fillStyle = (hovered && uiElem.hoverFill) || uiElem.fill;
            if (uiElem.fill || (hovered && uiElem.hoverFill)) ctx.fill();
            ctx.lineWidth = (hovered && uiElem.hoverWidth) || uiElem.strokeWidth;
            ctx.strokeStyle = (hovered && uiElem.hoverStroke) || uiElem.stroke;
            if (uiElem.stroke || (hovered && uiElem.hoverStroke)) ctx.stroke();
            ctx.closePath();
        },
    };
    return uiElem;
}

function UIScroll(x, y, w, h, { scrollWidth, scrollHeight, barWidth = 10, bkg = "#000", hideScroll = false } = {}) {
    const UI = makeUI();
    UI.scrollBarWidth = barWidth;
    UI.content = { width: scrollWidth ?? w, height: scrollHeight ?? h };
    UI.scroll = { x: !!(w < UI.content.width), y: !!(h < UI.content.height) };
    UI.scrollPosition = { x: 0, y: 0 };
    UI.displayWidth = UI.content.width - w;
    UI.displayHeight = UI.content.height - h;
    UI.onscroll = function (e) {
        this.scrollPosition.x = clamp(this.scrollPosition.x + e.deltaX, 0, this.displayWidth);
        this.scrollPosition.y = clamp(this.scrollPosition.y + e.deltaY, 0, this.displayHeight);
        this.ondraw();
    }.bind(UI);
    UI.scrolljump = function (e) {
        const clickedX =
            this.scroll.x && detectRect(x, y + h - this.scrollBarWidth, w, this.scrollBarWidth, mouse.x, mouse.y);
        const clickedY =
            this.scroll.y && detectRect(x + w - this.scrollBarWidth, y, this.scrollBarWidth, h, mouse.x, mouse.y);
        if (clickedX == clickedY) return;
        else if (clickedX) {
            const barHeight = w - (this.scroll.y ? this.scrollBarWidth : 0);
            const scrollBarHeight = (barHeight / this.content.width) * barHeight;
            const newScrollRatio = (mouse.x - x - scrollBarHeight / 2) / (barHeight - scrollBarHeight);
            this.scrollPosition.x = Math.max(0, Math.min(newScrollRatio * this.displayWidth, this.displayWidth));
        } else if (clickedY) {
            const barHeight = h - (this.scroll.x ? this.scrollBarWidth : 0);
            const scrollBarHeight = (barHeight / this.content.height) * barHeight;
            const newScrollRatio = (mouse.y - y - scrollBarHeight / 2) / (barHeight - scrollBarHeight);
            this.scrollPosition.y = Math.max(0, Math.min(newScrollRatio * this.displayHeight, this.displayHeight));
        }
        if (e) e.stopImmediatePropagation();
        this.ondraw();
    }.bind(UI);
    UI.startScroll = function () {
        this.scrolljump();
        document.addEventListener("mousemove", this.scrolljump);
    }.bind(UI);
    UI.stopScroll = function () {
        document.removeEventListener("mousemove", this.scrolljump);
    }.bind(UI);
    UI.drawScrollBarX = function (forced = !hideScroll) {
        if (!this.scroll.x) return;
        const barHeight = w - (this.scroll.y ? this.scrollBarWidth : 0);
        const scrollBarHeight = (barHeight / this.content.width) * w;
        const scrollBarTop = (this.scrollPosition.x / this.displayWidth) * (barHeight - scrollBarHeight);
        const scrollOff = h - this.scrollBarWidth;
        if (forced || detectRect(x, y + scrollOff, w, this.scrollBarWidth, mouse.x, mouse.y)) {
            ctx.fillStyle = "#333";
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x, y + scrollOff, w, this.scrollBarWidth);
            ctx.globalAlpha = 0.8;
            ctx.fillRect(x + scrollBarTop, y + scrollOff, scrollBarHeight, this.scrollBarWidth);
            ctx.globalAlpha = 1;
            if (!forced) this.drawScrollBarY(true);
        }
    }.bind(UI);
    UI.drawScrollBarY = function (forced = !hideScroll) {
        if (!this.scroll.y) return;
        const barHeight = h - (this.scroll.x ? this.scrollBarWidth : 0);
        const scrollBarHeight = (barHeight / this.content.height) * h;
        const scrollBarTop = (this.scrollPosition.y / this.displayHeight) * (barHeight - scrollBarHeight);
        const scrollOff = w - this.scrollBarWidth;
        if (forced || detectRect(x + scrollOff, y, this.scrollBarWidth, h, mouse.x, mouse.y)) {
            ctx.fillStyle = "#333";
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x + scrollOff, y, this.scrollBarWidth, h);
            ctx.globalAlpha = 0.8;
            ctx.fillRect(x + scrollOff, y + scrollBarTop, this.scrollBarWidth, scrollBarHeight);
            ctx.globalAlpha = 1;
            if (!forced) this.drawScrollBarX(true);
        }
    }.bind(UI);
    const defaultDraw = UI.draw;
    UI.draw = function () {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fillStyle = bkg;
        ctx.fill();
        ctx.clip();
        ctx.translate(-this.scrollPosition.x, -this.scrollPosition.y);
        defaultDraw.call(this);
        ctx.restore();
        this.drawScrollBarX();
        this.drawScrollBarY();
    }.bind(UI);
    const defaultShow = UI.show;
    UI.show = function () {
        document.addEventListener("wheel", this.onscroll);
        document.addEventListener("mousedown", this.startScroll);
        document.addEventListener("mouseup", this.stopScroll);
        defaultShow.call(this);
    }.bind(UI);
    const defaultHide = UI.hide;
    UI.hide = function () {
        this.stopScroll();
        document.removeEventListener("wheel", this.onscroll);
        document.removeEventListener("mousedown", this.startScroll);
        document.removeEventListener("mouseup", this.stopScroll);
        document.removeEventListener("mousemove", this.scrolljump);
        defaultHide.call(this);
    }.bind(UI);
    const defaultAction = UI.action;
    UI.action = function (event, mX, mY) {
        defaultAction.call(this, event, mouse.x + this.scrollPosition.x, mouse.y + this.scrollPosition.y);
    }.bind(UI);
    UI.detect = (mX, mY) => detectRect(x, y, w, h, mX, mY);
    return UI;
}

function UIProgressBar(getprogress, x, y, width, height, { fill, background } = {}) {
    const uiElem = {
        ...{ x, y, width, height, background, fill, getprogress },
        onupdate: () => (uiElem.value = uiElem.getprogress()),
        value: 0,
        draw: () => {
            // Draw the background
            if (uiElem.background) {
                ctx.fillStyle = uiElem.background;
                ctx.fillRect(uiElem.x, uiElem.y, uiElem.width, uiElem.height);
            }

            // Draw the progress bar
            if (uiElem.fill) {
                ctx.fillStyle = uiElem.fill;
                ctx.fillRect(uiElem.x, uiElem.y, uiElem.value * uiElem.width, uiElem.height);
            }
        },
    };
    return uiElem;
}

function UIImage(src, x, y, { width, height } = {}) {
    const uiElem = {
        ...{ src, x, y, width, height },
        draw: () => {
            const image = new Image();
            image.src = uiElem.src;
            image.onload = () => {
                ctx.drawImage(image, uiElem.x, uiElem.y, uiElem.width, uiElem.height);
            };
        },
    };

    return uiElem;
}

function UIPopup(
    x,
    y,
    width,
    height,
    title,
    message,
    scale,
    { radius, textColor, border, strokeColor, buttonText = "Close", buttonColor, buttonAction, background } = {}
) {
    const popup = makeUI();
    const halfScale = scale / 2;
    popup.add(
        UIRect(x, y, width, height, { radius: radius, fill: background, stroke: strokeColor, strokeWidth: border })
    );
    popup.add(
        UIText(title, x, y + scale, { width: width, center: true, font: `bold ${scale}px monospace`, color: textColor })
    );
    popup.add(
        UIText(message, x, y + scale + scale, {
            width: width,
            font: `bold ${halfScale}px monospace`,
            color: textColor,
            center: true,
        })
    );
    popup.add(
        UIButton(x + halfScale, y + height - scale - halfScale, width - scale, scale, buttonAction ?? popup.hide, {
            radius: radius,
            fill: buttonColor,
            strokeWidth: border,
            stroke: strokeColor,
        })
    );
    popup.add(
        UIText(buttonText, x, y + height - scale, {
            width: width,
            font: `bold ${scale * 0.75}px monospace`,
            color: textColor,
            center: true,
        })
    );

    return popup;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// BASE IO -- Use EventNameEvents to add default events
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function handleKeyDown(event) {
    keys[event.code] = true;
    if (typeof DownKeyEvents !== "undefined") for (let a in DownKeyEvents) if (event.code == a) DownKeyEvents[a]();
}

function handleKeyUp(event) {
    keys[event.code] = false;
    if (typeof UpKeyEvents !== "undefined") for (let a in UpKeyEvents) if (event.code == a) UpKeyEvents[a]();
}

function handleMouseDown(event) {
    if (typeof MouseEvents !== "undefined" && MouseEvents.Down) MouseEvents.Down(event);
}

function handleMouseUp(event) {
    if (typeof MouseEvents !== "undefined" && MouseEvents.Up) MouseEvents.Up(event);
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    if (typeof MouseEvents !== "undefined" && MouseEvents.Move) MouseEvents.Move(e);
}

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

function getYSign(entity) {
    let dir = entity?.dir ?? entity;
    return Math.sin(dir) > 0 ? 1 : Math.sin(dir) < 0 ? -1 : 0;
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

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CLASS DEFINITIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

class Identifiable {
    constructor(id) {
        this.id = id || crypto.randomUUID();
    }
    raise = (call, ...args) => this[call] && this[call].call(this, ...args);
}
class LayerManager {
    static layers = [];
    static activeLayer = -1;
    static lastTimestamp;
    static global;
    static ispaused = true;
    static {
        function registerListener(eventName) {
            document.addEventListener(eventName, function (event) {
                if (!LayerManager.global.ispaused) LayerManager.global[eventName](event);
                LayerManager.currentLayerStack.forEach((l) => !l.ispaused && l[eventName](event));
            });
        }
        window.onblur = LayerManager.pause;
        window.onfocus = LayerManager.resume;
        window.onload = () => {
            if (typeof load !== "undefined") load();
            LayerManager.resume();
        };
        document.addEventListener("mousedown", this.oninteract, { once: true });
        document.addEventListener("keydown", this.oninteract, { once: true });
        // document.addEventListener("contextmenu", (e) => e.preventDefault());
        registerListener("keydown");
        registerListener("keyup");
        registerListener("mousemove");
        registerListener("mousedown");
        registerListener("mouseup");
        registerListener("dblclick");
        registerListener("wheel");
    }
    static get currentLayerStack() {
        return LayerManager.layers[LayerManager.activeLayer];
    }
    static get currentLayer() {
        return LayerManager.currentLayerStack[0];
    }
    static layerAt(num) {
        LayerManager.layers[num] ??= [];
        return LayerManager.layers[num];
    }
    static update = (timestamp) => {
        // Fraction of a second since last update.
        const delta = (timestamp - LayerManager.lastTimestamp) / 1000;
        LayerManager.lastTimestamp = timestamp;
        if (!LayerManager.global.ispaused) LayerManager.global.update(delta);
        LayerManager.currentLayerStack.forEach((l) => !l.ispaused && l.update(delta));
        if (!LayerManager.global.ispaused) LayerManager.global.predraw();
        LayerManager.currentLayerStack.forEach((l) => !l.ispaused && l.predraw());
        LayerManager.updateframe = requestAnimationFrame(LayerManager.update);
    };
    static oninteract() {
        document.removeEventListener("mousedown", this.oninteract, { once: true });
        document.removeEventListener("keydown", this.oninteract, { once: true });
        LayerManager.interacted = true;
        if (!LayerManager.global.ispaused) LayerManager.global.interact();
        LayerManager.currentLayerStack.forEach((l) => !l.ispaused && l.interact());
    }
    static pause() {
        LayerManager.ispaused = true;
        cancelAnimationFrame(LayerManager.updateframe);
        LayerManager.global.pause();
        LayerManager.currentLayerStack.forEach((l) => l.pause());
    }
    static resume() {
        LayerManager.ispaused = false;
        cancelAnimationFrame(LayerManager.updateframe);
        LayerManager.lastTimestamp = document.timeline.currentTime;
        LayerManager.updateframe = requestAnimationFrame(LayerManager.update);
        LayerManager.global.resume();
        LayerManager.currentLayerStack.forEach((l) => l.resume());
    }
    static registerLayer(layer) {
        if (layer.layerNum === undefined) {
            LayerManager.changeLayer(LayerManager.activeLayer + 1);
            LayerManager.layers[LayerManager.activeLayer] ??= [];
            LayerManager.layers[LayerManager.activeLayer].push(layer);
            layer.layerNum = LayerManager.activeLayer;
        } else LayerManager.layerAt(layer.layerNum).push(layer);
    }
    static unregisterLayer(layer) {
        const idx = LayerManager.layers[layer.layerNum].findIndex((e) => e.id === layer.id);
        if (idx !== -1) LayerManager.layers[layer.layerNum].splice(idx, 1)[0].pause();
        if (LayerManager.layers[layer.layerNum].length === 0) {
            LayerManager.layers.splice(layer.layerNum, 1);
            LayerManager.changeLayer(LayerManager.activeLayer - 1);
        }
    }
    static changeLayer(layerNum) {
        LayerManager.currentLayerStack?.forEach((l) => l.pause());
        LayerManager.activeLayer = layerNum;
        LayerManager.currentLayerStack?.forEach((l) => l.resume());
    }
}
class Layer extends Identifiable {
    constructor({ id, layerNum } = {}, calls = {}) {
        super(id);
        this.entities = { Entity: new IterableWeakRef() };
        for (let v in Entity.types) this.entities[v] = new IterableWeakRef();
        this.layerNum = layerNum;
        for (let key in calls) this[key] = calls[key];
    }
    // Base Methods
    open = () => {};
    close = () => {};
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
        this.sounds.forEach((s) => s.play());
        this.music?.play();
    };
    scheduleTask = (func, options = {}, ...args) => {
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
        for (let v in Entity.types) {
            this.entities[v] ??= new IterableWeakRef();
            this.entities[v].forEach((e) => e.raise(call, ...args));
        }
    };
    // Game Update Events
    update = (delta) => this.propigate("update", delta);
    predraw = () => {
        ctx.save();
        if (this.cameraX !== undefined && this.cameraY !== undefined)
            ctx.translate(canvas.width / 2 - this.cameraX, canvas.height / 2 - this.cameraY);
        this.draw();
        ctx.restore();
    };
    draw = () => this.propigate("draw");
    interact = () => this.propigate("interact");
    // IO Events
    keydown = (e) => this.propigate("keydown", e);
    keyup = (e) => this.propigate("keyup", e);
    // Mouse IO Events
    mousedown = (e) => this.propigate("mousedown", e);
    mouseup = (e) => this.propigate("mouseup", e);
    mousemove = (e) => this.propigate("mousemove", e);
    dblclick = (e) => this.propigate("dblclick", e);
    wheel = (e) => this.propigate("wheel", e);
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
class UI extends Layer {
    children = [];
    constructor({ id }) {
        super({ id });
        this.parentUI = true;
        this.update = () => {
            this.children.forEach((c) => c.onupdate && c.onupdate());
        };
    }
    propigate = (call, ...args) => {
        this.raise("on" + call, ...args);
        this.children.forEach((c) => c[call] && c[call].call(this, ...args));
        for (let v in Entity.types) {
            this.entities[v] ??= new IterableWeakRef();
            this.entities[v].forEach((e) => e.raise(call, ...args));
        }
    };
    show = ({ overlay } = {}) => {
        if (overlay) this.layerNum = LayerManager.activeLayer;
        if (this.parentUI) LayerManager.registerLayer(this);

        this.children.forEach((c) => c.show && c.show());

        if (this.parentUI) this.mousedown = this._callAction;
    };

    _callAction = (e) => {
        this.propigate("action", e, mouse.x, mouse.y);
    };

    action = (event, mX, mY) => {
        if (this.parentUI) event.stopImmediatePropagation();
        this.children.forEach((c) => c.action && c.detect(mX, mY) && c.action(event, mX, mY));
    };

    detect = (mX, mY) => true;

    hide = () => {
        this.children.forEach((c) => c.hide && c.hide());
        if (this.parentUI) LayerManager.unregisterLayer(this);
    };

    add = (ui) => {
        ui.id = ui.id || crypto.randomUUID();
        ui.detect = ui.detect || (() => true);
        ui.parentUI = false;
        this.children.push(ui);
        return ui.id;
    };

    get = (id) => this.children.find((e) => e.id === id);

    remove = (id) => {
        const idx = this.children.findIndex((e) => e.id === id);
        if (idx !== -1) this.children.splice(idx, 1);
    };
}

class Entity extends Identifiable {
    static types = {};
    x = 0;
    y = 0;
    size = 0;
    dir = 0;
    speed = 0;
    exp = 0;
    neededXP = 0;
    level = 0;
    staticX = false;
    staticY = false;
    groupName = "Entity";
    constructor({ layerNum } = {}) {
        super();
        if (layerNum) LayerManager.get(layerNum);
    }
    update = (delta) => {
        this.raise("onupdate", delta);
        if (this.acceleration) this.speed = clamp(this.speed + this.acceleration, 0, this.maxSpeed);
        if (this.speed) {
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
            const i = new Image();
            i.src = this.img;
            ctx.save();
            ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
            ctx.drawImage(i, -halfSize, -halfSize, this.size, this.size);
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
        this.speed = Math.hypot(value, velY);
        this.dir = Math.atan2(vecY, value);
    }
    get velocityX() {
        return this.speed * Math.cos(this.dir);
    }
    get velocityXSign() {
        return Math.sign(this.velocityX);
    }
    set velocityY(value) {
        const velX = this.velocityX;
        this.speed = Math.hypot(velX, value);
        this.dir = Math.atan2(value, velX);
    }
    get velocityY() {
        return this.speed * Math.sin(this.dir);
    }
    get velocityYSign() {
        return Math.sign(this.velocityY);
    }
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

function registerEntity(name, options, types) {
    const upperName = name[0].toUpperCase() + name.slice(1);
    const lowerName = name[0].toLowerCase() + name.slice(1);
    const newSubclass = class extends Entity {
        static group = [];
        static get subtypes() {
            return types;
        }
        set(value) {
            types = value;
        }
        groupName = name;
    };
    for (let val in options) newSubclass.prototype[val] = options[val];
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
        for (let val in subType) newEntity[val] = subType[val];
        for (let val in additional) newEntity[val] = additional[val];
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

const global = (LayerManager.global = new Layer(
    { layerNum: null, id: "global" },
    {
        onkeydown: handleKeyDown,
        onkeyup: handleKeyUp,
        onmousedown: handleMouseDown,
        onmouseup: handleMouseUp,
        onmousemove: handleMouseMove,
    }
));

const game = new Layer({ id: "game" });

Object.defineProperty(game, "width", {
    get() {
        return canvas.width;
    },
    set(value) {
        canvas.width = value;
    },
});

Object.defineProperty(game, "height", {
    get() {
        return canvas.height;
    },
    set(value) {
        canvas.height = value;
    },
});

LayerManager.registerLayer(game);

// TODO LIST:
// Move registration of layer to makeUI?
// Make All UI extend class
// Check if event.stopPropigation() is needed
// Add text input UI
// Add Icon to weapons
// Add Animations and .frames and playAnimation()
// Add comments && doc strings
// Add Example Template
// Add Platformer and Tile Template
//   https://www.freecodecamp.org/news/learning-javascript-by-making-a-game-4aca51ad9030/
//   https://jobtalle.com/2d_platformer_physics.html
//   https://www.educative.io/answers/how-to-make-a-simple-platformer-using-javascript
//   https://eloquentjavascript.net/15_event.html
