// Create a Multilayer Canvas so that Entities can be drawn on top of each other using z-index property
const MultiCanvas = new (class {
    #canvas = [];
    #ctx = [];
    constructor() {
        this.addCanvas("background");
        this.addCanvas(0);
        this.addCanvas("debug");
        this.canvas = new Proxy(this.#canvas, {
            get: (target, prop) => target[prop] || target[0][prop],
            set: (target, prop, value) => (target[prop] ? (target[prop] = value) : (target[0][prop] = value)),
        });
        this.ctx = new Proxy(this.#ctx, {
            get: (target, prop) => target[prop] || target[0][prop],
            // {
            //     if (target[prop] === undefined) {
            //         const method = target[0][prop];
            //         console.log(target[0], prop, method);
            //         if (typeof method === "function") return Reflect.apply(method, target[0], [prop]);
            //         return method;
            //     }
            //     const method = target[prop];
            //     console.log(target, prop, method);
            //     if (typeof method === "function") return Reflect.apply(method, target, [prop]);
            //     return method;
            // },
            set: (target, prop, value) => (target[prop] ? (target[prop] = value) : (target[0][prop] = value)),
        });
    }
    addCanvas = (zIdx) => {
        if (this.#canvas[zIdx]) return;
        const newCanvas = document.createElement("canvas");
        newCanvas.style.position = "absolute";
        newCanvas.style.top = "8";
        newCanvas.style.left = "8";
        newCanvas.style.zIndex = zIdx;
        this.#canvas[zIdx] = newCanvas;
        this.#ctx[zIdx] = newCanvas.getContext("2d");
        document.body.appendChild(newCanvas);
    };
})();

fillScreen = ({ color }) => {
    ctx.save();
    ctx.resetTransform();
    if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
};
colorPath = ({ hovered, fill, stroke, strokeWidth, hoverFill, hoverStroke, hoverWidth } = {}) => {
    ctx.fillStyle = (hovered && hoverFill) || fill;
    if (fill || (hovered && hoverFill)) ctx.fill();
    ctx.lineWidth = (hovered && hoverWidth) || strokeWidth;
    ctx.strokeStyle = (hovered && hoverStroke) || stroke;
    if (stroke || (hovered && hoverStroke)) ctx.stroke();
};
drawRect = (x, y, zIdx, w, h, options = {}) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, options?.cornerRadius);
    colorPath(options);
    ctx.closePath();
};
drawCircle = (x, y, zIdx, radius, options = {}) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    colorPath(options);
    ctx.closePath();
};
drawCone = (x, y, zIdx, direction, arcLength, radius, options = {}) => {
    const startAngle = direction - arcLength / 2;
    const endAngle = direction + arcLength / 2;

    ctx.beginPath();
    if (options.noLines === undefined) ctx.moveTo(x, y);
    // Draw the arc
    ctx.arc(x, y, radius * 3, startAngle, endAngle);
    if (options.noLines === undefined) ctx.lineTo(x, y);
    colorPath(options);
    ctx.closePath();
};
drawText = (text, x, y, zIdx, { width, font, color, center, linewrap } = {}) => {
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
drawImage = (src, x, y, zIdx, { width, height } = {}) => {
    drawImage.cache ??= {};
    if (drawImage.cache[src]) return ctx.drawImage(drawImage.cache[src], x, y, width, height);
    const image = new Image();
    image.src = src;
    image.onload = () => {
        ctx.drawImage(image, x, y, width, height);
        drawImage.cache[src] = image;
    };
};
drawEntity = (entity) => {
    const halfSize = entity.size / 2;
    if (entity.img) {
        ctx.save();
        ctx.scale(entity.flipX ? -1 : 1, entity.flipY ? -1 : 1);
        drawImage(entity.img, -halfSize, -halfSize, { width: entity.size, height: entity.size });
        ctx.restore();
        //TODO: ONLOAD ANIMATION CODE
    } else {
        ctx.fillStyle = entity.color;
        if (entity.shape == "circle") {
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
};
// Make public getter for MultiCanvas's canvas and ctx
const canvas = MultiCanvas.canvas[0];
const ctx = MultiCanvas.ctx[0];
