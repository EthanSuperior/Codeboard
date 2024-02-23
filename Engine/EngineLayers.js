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
        document.addEventListener("mousedown", this.interact, { once: true });
        document.addEventListener("keydown", this.interact, { once: true });
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
    interact = () => {
        document.removeEventListener("mousedown", this.interact, { once: true });
        document.removeEventListener("keydown", this.interact, { once: true });
        this.interacted = true;
        this.propagate("interact");
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
    findTask = (id) => this.tasks.find((t) => t.id === id);
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
    getEntities = () => this.spacialMap.getEntities();
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
