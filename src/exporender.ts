interface Window {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

let crossVertIndex = 0;

let crossX = 0;
let crossY = 0;


window.onload = () => {
    window.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    window.ctx = window.canvas.getContext("2d")!;
    if (window.canvas) {
        console.log("Hello ExpoRender!");
    } else {
        console.log("Couldn't load canvas");
    }

    let infoElement = document.getElementById("info")!;
    let canvasElement = document.getElementById("canvas")!;

    tris[0].colors[0] = 0xFF0000FF;
    tris[0].colors[1] = 0xFF0000FF;
    tris[0].colors[2] = 0xFF0000FF;

    canvasElement.onclick = (evt) => {
        tris[0].verticesX[crossVertIndex] = crossX;
        tris[0].verticesY[crossVertIndex] = crossY;

        crossVertIndex++;

        if (crossVertIndex >= 3) {
            crossVertIndex = 0;
        }
    };

    canvasElement.style.cursor = 'none';
    canvasElement.onmousemove = (evt) => {
        infoElement.innerText = `
        Pos X: ${crossX}
        Pos Y: ${crossY}

        Set Vertex ${crossVertIndex}
        `;

        let ratio = canvasElement.clientWidth / WIDTH;

        let rect = canvasElement.getBoundingClientRect();

        crossX = ((evt.clientX - rect.left) / ratio) | 0;
        crossY = ((evt.clientY - rect.top) / ratio) | 0;
    };

    requestAnimationFrame(frameDriver);
};

function debug(msg: any) {
    let debugElement = document.getElementById("debug")!;
    debugElement.innerText = msg;
}

class Triangle {
    verticesX = new Uint32Array(3);
    verticesY = new Uint32Array(3);

    colors = new Uint32Array(3);

    constructor(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,

        color0: number,
        color1: number,
        color2: number,
    ) {
        this.verticesX[0] = x0;
        this.verticesY[0] = y0;
        this.verticesX[1] = x1;
        this.verticesY[1] = y1;
        this.verticesX[2] = x2;
        this.verticesY[2] = y2;

        this.colors[0] = color0;
        this.colors[1] = color1;
        this.colors[2] = color2;
    }
}

let tris = new Array(1).fill(0).map(
    () => new Triangle(
        0, 0,
        0, 0,
        0, 0,

        0xFF0000FF,
        0xFF0000FF,
        0xFF0000FF
    )
);

const WIDTH = 256;
const HEIGHT = 192;
const BYTES_PER_PIXEL = 4;

let buffer = new ImageData(WIDTH, HEIGHT);
let clearColor = Uint8Array.of(0xDD, 0xDD, 0xDD, 0xFF);

let pixelsFilled = 0;

let verticesXBuf = new Uint32Array(3);
let verticesYBuf = new Uint32Array(3);

function renderScene() {
    for (let t = 0; t < tris.length; t++) {
        let tri = tris[t];

        for (let v = 0; v < 3; v++) {
            // Place vertices into temporary buffers
            verticesXBuf[v] = tri.verticesX[v];
            verticesYBuf[v] = tri.verticesY[v];
        }

        // console.log(`${verticesXBuf[0]}, ${verticesXBuf[1]}, ${verticesXBuf[2]}`);

        // Insertion sort vertices by Y
        let i = 1;
        while (i < 3 /* length */) {
            let j = i;
            while (j > 0 && verticesYBuf[j - 1] > verticesYBuf[j]) {
                let tempX = verticesXBuf[j];
                let tempY = verticesYBuf[j];

                verticesXBuf[j] = verticesXBuf[j - 1];
                verticesYBuf[j] = verticesYBuf[j - 1];

                verticesXBuf[j - 1] = tempX;
                verticesYBuf[j - 1] = tempY;

                j--;
            }
            i++;
        }

        let line = bounds(0, HEIGHT - 1, verticesYBuf[0]);
        let endingLine = bounds(0, HEIGHT - 1, verticesYBuf[2]);

        for (; line <= endingLine; line++) {
            let leftEdge0X = verticesXBuf[1];
            let leftEdge0Y = verticesYBuf[1];
            let leftEdge1X = verticesXBuf[0];
            let leftEdge1Y = verticesYBuf[0];

            let rightEdge0X = verticesXBuf[0];
            let rightEdge0Y = verticesYBuf[0];
            let rightEdge1X = verticesXBuf[2];
            let rightEdge1Y = verticesYBuf[2];

            let color = tri.colors[0];

            if (line >= leftEdge0Y && !(rightEdge1Y == line && leftEdge0Y == line)) {
                leftEdge1X = rightEdge1X;
                leftEdge1Y = rightEdge1Y;

                let tmp = leftEdge1X;
                leftEdge1X = leftEdge0X;
                leftEdge0X = tmp;

                // color ^= 0xFFFFFF00;
            }

            let leftEdgeHeight = leftEdge1Y - leftEdge0Y;
            let rightEdgeHeight = rightEdge1Y - rightEdge0Y;

            let leftEdgeStartY = min(leftEdge1Y, leftEdge0Y);
            let rightEdgeStartY = min(rightEdge1Y, rightEdge0Y);

            let leftEdgeRelativeY = line - leftEdgeStartY;
            let rightEdgeRelativeY = line - rightEdgeStartY;

            let leftEdgeXRatio = abs(leftEdgeRelativeY / leftEdgeHeight);
            let rightEdgeXRatio = abs(rightEdgeRelativeY / rightEdgeHeight);

            // debug(`
            //     L: ${leftEdgeHeight}
            //     R: ${rightEdgeHeight}
            // `);

            // console.log(`left  X ratio: ${leftEdgeXRatio}`)
            // console.log(`right X ratio: ${rightEdgeXRatio}`)

            // console.log(`left X: ${leftEdge0X}`)

            let leftEdgeLerped = bounds(0, WIDTH - 1, lerp(leftEdge1X, leftEdge0X, leftEdgeXRatio));
            let rightEdgeLerped = bounds(0, WIDTH - 1, lerp(rightEdge0X, rightEdge1X, rightEdgeXRatio));

            // If the left is to the right of the right for some reason, swap left and right
            if (leftEdgeLerped >= rightEdgeLerped) {
                let tmp = rightEdgeLerped;
                rightEdgeLerped = leftEdgeLerped;
                leftEdgeLerped = tmp;
            }

            let leftEdgeTriRatio = 1 - (leftEdgeLerped % 1);
            let rightEdgeTriRatio = rightEdgeLerped % 1;

            let leftEdgeLerpedRounded = leftEdgeLerped | 0;
            let rightEdgeLerpedRounded = rightEdgeLerped | 0;

            // console.log(`lerped left  X: ${leftEdgeLerped}`)
            // console.log(`lerped right X: ${rightEdgeLerped}`)

            let lineLength = rightEdgeLerpedRounded - leftEdgeLerpedRounded;
            // console.log(`length: ${lineLength}`)

            // pls mr runtime, round down...
            let base = ((line * WIDTH) + (leftEdgeLerpedRounded | 0)) * BYTES_PER_PIXEL;

            const c0 = (color >> 24) & 0xFF;
            const c1 = (color >> 16) & 0xFF;
            const c2 = (color >> 8) & 0xFF;
            const c3 = (color >> 0) & 0xFF;

            // put left pixel in
            let leftAntialiasAlpha = c3 * leftEdgeTriRatio / 0xFF;
            buffer.data[base + 0] = lerp(buffer.data[base + 0], c0, leftAntialiasAlpha);
            buffer.data[base + 1] = lerp(buffer.data[base + 1], c1, leftAntialiasAlpha);
            buffer.data[base + 2] = lerp(buffer.data[base + 2], c2, leftAntialiasAlpha);
            base += 4;

            for (let p = 0; p < lineLength; p++) {
                buffer.data[base + 0] = lerp(buffer.data[base + 0], c0, c3); /* R */;
                buffer.data[base + 1] = lerp(buffer.data[base + 1], c1, c3); /* G */;
                buffer.data[base + 2] = lerp(buffer.data[base + 2], c2, c3); /* B */;
                base += 4;
            }

            pixelsFilled += lineLength + 2;

            // put right pixel in
            let rightAntialiasAlpha = c3 * (rightEdgeTriRatio / 255);
            buffer.data[base + 0] = lerp(buffer.data[base + 0], c0, rightAntialiasAlpha);
            buffer.data[base + 1] = lerp(buffer.data[base + 1], c1, rightAntialiasAlpha);
            buffer.data[base + 2] = lerp(buffer.data[base + 2], c2, rightAntialiasAlpha);
            base += 4;

            // put right pixel in 
        }
    }
}

function drawCrosshair() {
    let col = 0x000000FF;
    switch (crossVertIndex) {
        case 0: col = 0xFF0000FF; break;
        case 1: col = 0x00FF00FF; break;
        case 2: col = 0x0000FFFF; break;
    }

    let x = crossX;
    let y = crossY;

    setPixel(x + 0, y - 1, col);
    setPixel(x + 0, y - 2, col);

    setPixel(x + 0, y + 1, col);
    setPixel(x + 0, y + 2, col);

    setPixel(x - 1, y + 0, col);
    setPixel(x - 2, y + 0, col);

    setPixel(x + 1, y + 0, col);
    setPixel(x + 2, y + 0, col);
}

function invertColorAt(x: number, y: number) {
    // Invert RGB channels
    setPixel(x, y, getPixel(x, y) ^ 0xFFFFFF00);
}

function drawDots() {
    for (let t = 0; t < tris.length; t++) {
        let tri = tris[t];
        for (let v = 0; v < 3; v++) {
            let col = 0x000000FF;
            switch (v) {
                case 0: col = 0xFF0000FF; break;
                case 1: col = 0x00FF00FF; break;
                case 2: col = 0x0000FFFF; break;
            }
            let x = tri.verticesX[v];
            let y = tri.verticesY[v];
            setPixel(x - 1, y - 1, col);
            setPixel(x + 0, y - 1, col);
            setPixel(x + 1, y - 1, col);
            setPixel(x - 1, y + 0, col);
            setPixel(x + 1, y + 0, col);
            setPixel(x - 1, y + 1, col);
            setPixel(x + 0, y + 1, col);
            setPixel(x + 1, y + 1, col);
        }
    }
}

function setPixel(x: number, y: number, col: number) {
    if (x >= WIDTH) return;
    if (y >= WIDTH) return;

    const c0 = (col >> 24) & 0xFF;
    const c1 = (col >> 16) & 0xFF;
    const c2 = (col >> 8) & 0xFF;
    const c3 = (col >> 0) & 0xFF;

    let base = ((y * WIDTH) + x) * BYTES_PER_PIXEL;
    buffer.data[base + 0] = c0;
    buffer.data[base + 1] = c1;
    buffer.data[base + 2] = c2;
    buffer.data[base + 3] = c3;
}

function getPixel(x: number, y: number): number {
    let base = ((y * WIDTH) + x) * BYTES_PER_PIXEL;
    return (buffer.data[base + 0] << 24) |
        (buffer.data[base + 1] << 16) |
        (buffer.data[base + 2] << 8) |
        (buffer.data[base + 3] << 0);
}


function clear() {
    let pos = 0;
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        for (let j = 0; j < BYTES_PER_PIXEL; j++) {
            buffer.data[pos++] = clearColor[j];
        }
    }
}

function display() {
    window.ctx.putImageData(buffer, 0, 0);
}

let time = 0;
function frame(time: DOMHighResTimeStamp) {
    time += time;

    // let ratio = (Math.sin(time / 1000) + 1) / 2;
    // let x = lerp(0, 400, ratio);

    // clockwise winding order
    tris[0] = new Triangle(
        96, 64,
        160, 128,
        96, 128,

        0xFF0000FF,
        0xFF0000FF,
        0xFF0000FF,
    );

    tris[1] = new Triangle(
        96, 64,
        160, 64,
        160, 128,

        0xFF0000FF,
        0xFF0000FF,
        0xFF0000FF,
    );

    // 79.57741211: 1 rotation per second
    let speedMul = 0.5;
    let rad = time / (Math.PI * 2 * 79.57741211 / speedMul);
    let sin = Math.sin(rad);
    let cos = Math.cos(rad);
    rotateTri(tris[0], WIDTH / 2, HEIGHT / 2, sin, cos);
    rotateTri(tris[1], WIDTH / 2, HEIGHT / 2, sin, cos);

    debug(
    `[${matrixTruncater(cos)}, ${matrixTruncater(-sin)}]
     [${matrixTruncater(sin)}, ${matrixTruncater(cos)}]`
    );

    renderScene();

    drawDots();
    drawCrosshair();

    display();
    clear();
}

function frameDriver(time: DOMHighResTimeStamp) {
    frame(time);
    requestAnimationFrame(frameDriver);
}

function lerp(in0: number, in1: number, factor: number) {
    return (1 - factor) * in0 + factor * in1;
}

function min(in0: number, in1: number): number {
    if (in0 > in1) return in1;
    return in0;
}

function max(in0: number, in1: number): number {
    if (in1 > in0) return in1;
    return in0;
}

function abs(in0: number): number {
    if (in0 < 0) return in0 * -1;
    return in0;
}

function bounds(bMin: number, bMax: number, val: number): number {
    return max(bMin, min(bMax, val));
}

function rotateTri(tri: Triangle, originX: number, originY: number, sin: number, cos: number) {
    for (let i = 0; i < 3; i++) {
        let origX = tri.verticesX[i];
        let origY = tri.verticesY[i];
        // Translate point to origin
        tri.verticesX[i] = originX + ((origX - originX) * cos - (origY - originY) * sin);
        tri.verticesY[i] = originY + ((origX - originX) * sin + (origY - originY) * cos);
    }
}

function toDegrees(radians: number) {
    return radians * (180 / Math.PI);
}

function matrixTruncater(num: number): string {
    let trunc = 10000;
    if (num < 0) trunc = 1000;
    return r_pad((((num * trunc) | 0) / trunc).toString(), 6, '0');
}

function pad(n: string, width: number, z: string) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function r_pad(n: string, width: number, z: string) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : n + new Array(width - n.length + 1).join(z);
}
