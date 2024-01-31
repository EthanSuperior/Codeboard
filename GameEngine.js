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
// preload()
// start()
// updateGame(delta)

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CORE VARIABLES
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
const keys = {};
const tasks = [];
let mouse = { x: 0, y: 0 };
let paused = false;
let inMenu = false;
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CORE EVENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
window.onblur = pause;
window.onfocus = resume;
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mousedown", handleMouseDown);
document.addEventListener("mouseup", handleMouseUp);
window.onload = () => {
    if (typeof preload !== "undefined") preload();
    if (typeof start !== "undefined") start();
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// BASE UI
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function makeUI(id) {
    return new UI(id);
}
function UI(id) {
    this.children = [];
    this.id = id ?? crypto.randomUUID();
    this.parentUI = true;
    this.show = function () {
        if (this.parentUI) {
            inMenu = true;
            pause();
        }
        this.children.forEach((c) => c.show && c.show());
        if (this.parentUI) {
            document.addEventListener("mousedown", this._callAction, { once: true });
            document.addEventListener("mousemove", this.draw);
            requestAnimationFrame(this.draw);
        }
    }.bind(this);
    this._callAction = function (e) {
        this.action(e, mouse.x, mouse.y);
    }.bind(this);
    this.draw = function () {
        this.children.forEach((c) => c.draw && c.draw());
    }.bind(this);
    this.action = function (event, mX, mY) {
        if (this.parentUI) {
            event.stopImmediatePropagation();
            document.addEventListener("mousedown", this._callAction, { once: true });
        }
        this.children.forEach((c) => c.action && c.detect(mX, mY) && c.action(event, mX, mY));
    }.bind(this);
    this.detect = function (mX, mY) {
        return true;
    }.bind(this);
    this.hide = function () {
        this.children.forEach((c) => c.hide && c.hide());
        document.removeEventListener("mousedown", this._callAction, { once: true });
        document.removeEventListener("mousemove", this.draw);
        if (this.parentUI) {
            inMenu = false;
            resume();
        }
    }.bind(this);
    this.add = function (ui) {
        ui.id ??= crypto.randomUUID();
        ui.detect ??= () => true;
        ui.parentUI = false;
        this.children.push(ui);
        return ui.id;
    }.bind(this);
    this.get = function (id) {
        return this.children.find((e) => e.id === id);
    }.bind(this);
    this.remove = function (id) {
        const idx = this.children.findIndex((e) => e.id === id);
        if (idx == -1) return;
        this.children.splice(idx, 1);
    }.bind(this);
}
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// BASIC UI ELEMENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function UIButton([x, y, w, h, r = 0], action, { fill, stroke, width, hoverFill, hoverStroke, hoverWidth } = {}) {
    return {
        draw: () => {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            const hovered = ctx.isPointInPath(mouse.x, mouse.y);
            ctx.fillStyle = (hovered && hoverFill) || fill;
            if (fill || (hovered && hoverFill)) ctx.fill();
            ctx.lineWidth = (hovered && hoverWidth) || width;
            ctx.strokeStyle = (hovered && hoverStroke) || stroke;
            if (stroke || (hovered && hoverStroke)) ctx.stroke();
            ctx.closePath();
        },
        detect: (mX, mY) => detectRect(x, y, w, h, mX, mY),
        action,
    };
}
function UIText(text, [x, y, width], { font, color, center } = {}) {
    return {
        draw: () => {
            // TO ADD: TEXT CENTER W/ WIDTH && NEXT_LINES
            if (color) ctx.fillStyle = color;
            if (font) ctx.font = font;
            ctx.fillText(text, x, y, width);
        },
    };
}
function UICircle([x, y, r], { fill, stroke, width, hoverFill, hoverStroke, hoverWidth } = {}) {
    return {
        draw: () => {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            const hovered = ctx.isPointInPath(mouse.x, mouse.y);
            ctx.fillStyle = (hovered && hoverFill) || fill;
            if (fill || (hovered && hoverFill)) ctx.fill();
            ctx.lineWidth = (hovered && hoverWidth) || width;
            ctx.strokeStyle = (hovered && hoverStroke) || stroke;
            if (stroke || (hovered && hoverStroke)) ctx.stroke();
            ctx.closePath();
        },
    };
}
function UIRect([x, y, w, h, r = 0], { fill, stroke, width, hoverFill, hoverStroke, hoverWidth } = {}) {
    return {
        draw: () => {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            const hovered = ctx.isPointInPath(mouse.x, mouse.y);
            ctx.fillStyle = (hovered && hoverFill) || fill;
            if (fill || (hovered && hoverFill)) ctx.fill();
            ctx.lineWidth = (hovered && hoverWidth) || width;
            ctx.strokeStyle = (hovered && hoverStroke) || stroke;
            if (stroke || (hovered && hoverStroke)) ctx.stroke();
            ctx.closePath();
        },
    };
}
function UIScroll([x, y, w, h], { scrollWidth, scrollHeight, barWidth = 10, bkg = "#000", hideScroll = false } = {}) {
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
        this.draw();
    }.bind(UI);
    UI.onscrolljump = function (e) {
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
        this.draw();
    }.bind(UI);
    UI.startScroll = function () {
        this.onscrolljump();
        document.addEventListener("mousemove", this.onscrolljump);
    }.bind(UI);
    UI.stopScroll = function () {
        document.removeEventListener("mousemove", this.onscrolljump);
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
        document.removeEventListener("mousemove", this.onscrolljump);
        defaultHide.call(this);
    }.bind(UI);
    const defaultAction = UI.action;
    UI.action = function (event, mX, mY) {
        defaultAction.call(this, event, mouse.x + this.scrollPosition.x, mouse.y + this.scrollPosition.y);
    }.bind(UI);
    UI.detect = (mX, mY) => detectRect(x, y, w, h, mX, mY);
    return UI;
}
function UIPopup([x, y, w, h, r = 0], { fill, stroke, width, hoverFill, hoverStroke, hoverWidth } = {}) {
    const UI = makeUI();
    UI.add(UIRect([x, y, w, h, r], { fill, stroke, width, hoverFill, hoverStroke, hoverWidth }));
    return UI;
}
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// BASE IO -- Supports KeyEvents list for events on KeyDown
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function handleKeyDown(event) {
    keys[event.code] = true;
    if (typeof DownKeyEvents !== "undefined") for (let a in DownKeyEvents) if (event.code == a) DownKeyEvents[a]();
}

function handleKeyUp(event) {
    keys[event.code] = false;
    if (typeof UpKeyEvents !== "undefined") for (let a in UpKeyEvents) if (event.code == a) UpKeyEvents[a]();
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    if (typeof MouseEvents !== "undefined" && MouseEvents.Move) MouseEvents.Move(e);
}

function handleMouseDown(event) {
    if (typeof MouseEvents !== "undefined" && MouseEvents.Down) MouseEvents.Down(event);
}
function handleMouseUp(event) {
    if (typeof MouseEvents !== "undefined" && MouseEvents.Up) MouseEvents.Up(event);
}
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// TIMING FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const scheduleTask = (func, options, ...args) => new Task(func, options, ...args).id;
const clearTask = (id) => {
    const idx = tasks.findIndex((e) => e.id === id);
    if (idx < 0) return;
    tasks[idx].pause();
    tasks.splice(idx, 1);
};

function Task(func, { time, loop, id, immediate = false }, ...args) {
    const exists = id && tasks.find((e) => e.id === id);
    const task = exists || this;
    task.id = id ?? crypto.randomUUID();
    task.func = func;
    task.args = args;
    task.time = 1_000 * time ?? 0;
    task.loop = !!loop;
    if (exists) {
        if (task.isPaused) return task;
        task.pause();
        task.resume();
        return task;
    }
    task.isPaused = paused;
    task.remaining = task.time;
    task.start = ((delay) => {
        if (task.isPaused) return;
        task.startTime = Date.now();
        const timeout = () => {
            this.func(...this.args);
            if (this.loop) this.start(this.time);
            else removeEntity(tasks, this);
        };
        clearTimeout(task.timer);
        this.timer = setTimeout(timeout.bind(this), delay);
    }).bind(task);
    task.pause = () => {
        if (task.isPaused) return;
        task.isPaused = true;
        clearTimeout(task.timer);
        task.remaining = task.time - (Date.now() - task.startTime);
    };
    task.resume = () => {
        task.isPaused = false;
        task.start(task.remaining);
    };
    task.peek = () => {
        if (!task.isPaused) {
            task.remaining = task.time - (Date.now() - task.startTime);
        }
        return task.remaining;
    };
    if (immediate) task.func(...task.args);
    task.start(task.remaining);
    tasks.push(task);
}

function pause() {
    paused = true;
    cancelAnimationFrame(tasks.updateframe);
    forEntities(tasks, (task) => task.pause());
}

function resume(menu) {
    if (inMenu) return;
    paused = false;
    cancelAnimationFrame(tasks.updateframe);
    forEntities(tasks, (task) => task.resume());
    update.lastTimestamp = document.timeline.currentTime;
    tasks.updateframe = requestAnimationFrame(update);
}

function togglePause() {
    if (paused) resume();
    else pause();
}
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
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// UPDATE FUNCTION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function update(timestamp) {
    if (paused) return;
    //Fraction of a second since last update.
    const delta = (timestamp - update.lastTimestamp) / 1000;
    update.lastTimestamp = timestamp;
    if (typeof updateGame !== "undefined") updateGame(delta);
    tasks.updateframe = requestAnimationFrame(update);
}

function forEntities(arr, func, ...args) {
    for (let i = arr.length - 1; i >= 0; i--) {
        const entity = arr[i];
        if (!entity) continue;
        func(entity, ...args);
    }
}

function entityEvent(entity, call, ...args) {
    if (entity[call]) entity[call].call(entity, entity, ...args);
}

function spawnEntity(arr, base, props) {
    const newEntity = { id: crypto.randomUUID(), ...base, ...props };
    arr.push(newEntity);
    entityEvent(newEntity, "onspawn");
    if (newEntity.lifespan)
        newEntity.lifeTimer = scheduleTask(
            () => {
                removeEntity(arr, newEntity);
            },
            { time: newEntity.lifespan }
        );
}

function removeEntity(arr, entity) {
    if (!entity) return;
    entityEvent(entity, "ondespawn");
    if (entity.lifeTimer) clearTask(entity.lifeTimer);
    const idx = arr.findIndex((e) => e.id === entity.id);
    if (idx == -1) return;
    arr.splice(idx, 1);
}

function updateEntity(entity, delta) {
    entityEvent(entity, "ontick", delta);
    if (entity.speed) {
        if (!entity.staticX) entity.x += Math.cos(entity.dir ?? 0) * entity.speed * delta;
        if (!entity.staticY) entity.y += Math.sin(entity.dir ?? 0) * entity.speed * delta;
    }
    drawEntity(entity, delta);
}

function drawEntity(entity, delta) {
    ctx.save();
    ctx.translate(entity.x, entity.y);
    if (entity.rotate) ctx.rotate(entity.dir + Math.PI / 2 + (entity.rotationalOffset ?? 0));
    const halfSize = entity.size / 2;
    if (entity.img) {
        const i = new Image();
        i.src = entity.img;
        ctx.drawImage(i, -halfSize, -halfSize, entity.size, entity.size);
        //TODO: ONLOAD ANIMATION CODE
    } else {
        ctx.fillStyle = entity.color;
        if (entity.shape == "custom") {
            entityEvent(entity, "draw", delta);
        } else if (entity.shape == "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, halfSize, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();
        } else if (entity.shape == "triangle") {
            ctx.beginPath();
            ctx.moveTo(0, -halfSize);
            ctx.lineTo(-halfSize, halfSize);
            ctx.lineTo(halfSize, halfSize);
            ctx.fill();
            ctx.closePath();
        } else if (entity.shape == "arrow") {
            ctx.beginPath();
            ctx.moveTo(0, -halfSize);
            ctx.lineTo(-halfSize, halfSize);
            ctx.lineTo(0, halfSize / 2);
            ctx.lineTo(halfSize, halfSize);
            ctx.fill();
            ctx.closePath();
        } else ctx.fillRect(-halfSize, -halfSize, entity.size, entity.size);
    }
    ctx.restore();
}
