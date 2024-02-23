/**
 * Options for configuring UI elements and their event callbacks.
 * @typedef {object} UIOptions
 * @property {boolean} [overlay] - Render to current layer or not
 * @property {function(number)} [onupdate] - Callback for the update event.
 * @property {function()} [oninteract] - Callback for the interact event.
 * @property {function(Event)} [onkeydown] - Callback for the keydown event.
 * @property {function(Event)} [onkeyup] - Callback for the keyup event.
 * @property {function(MouseEvent)} [onmousedown] - Callback for the mousedown event.
 * @property {function(MouseEvent)} [onmouseup] - Callback for the mouseup event.
 * @property {function(MouseEvent)} [onmousemove] - Callback for the mousemove event.
 * @property {function(MouseEvent)} [onclick] - Callback for the click event.
 * @property {function(MouseEvent)} [ondblclick] - Callback for the dblclick event.
 * @property {function(WheelEvent)} [onwheel] - Callback for the wheel event.
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
    mousedown = (e) => {
        e = this.modmouseevent(e);
        if (this.detect(e.mouseX, e.mouseY)) this.propagate("mousedown", e);
    };
    mousemove = (e) => {
        e = this.modmouseevent(e);
        if (this.options) this.options.hovered = this.detect(e.mouseX, e.mouseY);
        this.propagate("mousemove", e);
    };
    click = (e) => {
        e = this.modmouseevent(e);
        if (this.detect(e.mouseX, e.mouseY)) this.propagate("click", e);
    };
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
    detect = (mX, mY) => true;
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
    ondraw = () => UI.drawRect(this.x, this.y, this.width, this.height, this.options);
    detect = (mX, mY) => detectRect(this.x, this.y, this.width, this.height, mX, mY);
}
class UICircle extends UIElement {
    ondraw = () => UI.drawCircle(this.x, this.y, this.radius, this.options);
    detect = (mX, mY) => detectCircle(this.x, this.y, this.radius, mX, mY);
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
    ondraw = () => UI.drawText(this.text, this.x, this.y, this.options);
}
class UIImage extends UIElement {
    ondraw = () => UI.drawImage(this.src, this.x, this.y, this.options);
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
    detect = (mX, mY) => detectRect(this.x, this.y, this.width, parseInt(this.font ? this.font : ctx.font), mX, mY);
}
class UIProgressBar extends UIElement {
    get progress() {
        return this.getprogress();
    }
    ondraw = () => {
        // Draw the background
        UI.drawRect(this.x, this.y, this.width, this.height, {
            ...this.options,
            fill: this.background,
        });

        // Draw the progress bar
        if (this.fill) {
            ctx.fillStyle = this.fill;
            ctx.fillRect(this.x, this.y, this.progress * this.width, this.height);
        }
    };
}
class UIDialogue extends UIElement {
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
            font: `bold ${this.scale}px monospace`,
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
            detectRect(x, y + this.height - this.scrollBarWidth, this.width, this.scrollBarWidth, mouse.x, mouse.y);
        const clickedY =
            this.scroll.y &&
            detectRect(x + this.width - this.scrollBarWidth, y, this.scrollBarWidth, this.height, mouse.x, mouse.y);
        if (clickedX == clickedY) return;
        else if (clickedX) {
            const barHeight = this.width - (this.scroll.y ? this.scrollBarWidth : 0);
            const scrollBarHeight = (barHeight / this.content.width) * barHeight;
            const newScrollRatio = (mouse.x - this.x - scrollBarHeight / 2) / (barHeight - scrollBarHeight);
            this.scrollPosition.x = Math.max(0, Math.min(newScrollRatio * this.displayWidth, this.displayWidth));
        } else if (clickedY) {
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
    detect = (mX, mY) => detectRect(this.x, this.y, this.scrollWidth, this.scrollHeight, mX, mY);
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
     * @param {function} onclick - The callback function to be executed when the button is clicked.
     * @param {number} x - The x-coordinate of the button.
     * @param {number} y - The y-coordinate of the button.
     * @param {number} width - The width of the button.
     * @param {number} height - The height of the button.
     * @param {RectOptions} [options] - Additional options for configuring the button.
     * @returns {UIButton} - A Button UIElement object.
     */
    static Button = (onclick, x, y, width, height, options) => {
        return new UIRect(x, y, { width, height, onclick, ...options });
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
        { cornerRadius, color, buttonText = "Close", onclick, background, ...options } = {}
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
            onclick,
            background,
            ...options,
        });
        dialogue.onclick ??= () => dialogue.hide();
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
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    };
}
