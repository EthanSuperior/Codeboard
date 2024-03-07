const keys = {};
const mouse = { x: 0, y: 0 };

// GameSettings
// ├───Canvas Size
// ├───Scale
// ├───Tickrate
// ├───Game Mode
// ├───DEBUG MODE
// └───Level

const game = new (class GameSettings {
    baseEntity = {};
    draw = () => LayerManager.draw();
    /**
     * Clears the screen and fills it with the specified background color.
     * @type {function}
     */
    ondraw = () => {
        fillScreen({ color: this.background });
        MultiCanvas.ctx["debug"].clearRect(0, 0, canvas.width, canvas.height);
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
    get diagonal() {
        return Math.hypot(this.width, this.height);
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
    //TODO FIX ME FIXME
    set cameraX(value) {
        LayerManager.currentLayer.cameraX = value;
    }
    set cameraY(value) {
        LayerManager.currentLayer.cameraY = value;
    }
})();

// LayerManager
// │   ┌───GlobalLayer
// └───Layer
//     ├───RootUI
//     │   └───UIElements
//     ├───SpacialMap
//     │   └───Entity
//     └───AsyncManager
//         ├───Task
//         └───Lerp

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
        document.addEventListener("keypress", this.keypress);
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
    draw = () => {
        this.propagate("draw");
    };
    update = (timestamp) => {
        game.ondraw();
        // Fraction of a second since last update.
        const delta = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        this.propagate("update", delta);
        this.draw();
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
