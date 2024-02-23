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
    interact = () => this.propagate("interact");
    // Helper Utils
    modmouseevent = (e) => e;
    modkeyevent = (e) => e;
    // IO Events
    keydown = (e) => this.propagate("keydown", this.modkeyevent(e));
    keyup = (e) => this.propagate("keyup", this.modkeyevent(e));
    // Mouse IO Events
    mousedown = (e) => this.propagate("mousedown", this.modmouseevent(e));
    mouseup = (e) => this.propagate("mouseup", this.modmouseevent(e));
    mousemove = (e) => this.propagate("mousemove", this.modmouseevent(e));
    click = (e) => this.propagate("click", this.modmouseevent(e));
    dblclick = (e) => this.propagate("dblclick", this.modmouseevent(e));
    wheel = (e) => this.propagate("wheel", this.modmouseevent(e));
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
