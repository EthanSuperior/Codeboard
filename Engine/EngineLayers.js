// Layer => LayerManager
// ├───UI => UIRoot{IO}
// ├───Entity => SpacialMap{IO}
// └───Async => AsyncManager{dT}

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
        if (this.cameraFollow) {
            this.cameraX = this.cameraFollow.x;
            this.cameraY = this.cameraFollow.y;
        }
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
        new Layer({ id: "game" });
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

AddAccessor(globalThis, "currentLayer", { initial: LayerManager.currentLayer });
