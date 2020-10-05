interface Window {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

window.onload = () => {
    window.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    window.ctx = window.canvas.getContext("2d")!;
    if (window.canvas) {
        console.log("Hello ExpoRender!");
    } else {
        console.log("Couldn't load canvas");
    }

    requestAnimationFrame(frameDriver);
};


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

let tris = new Array(1).fill(0).map(() => new Triangle(0, 0, 0, 0, 0, 0, 0, 0, 0));

const WIDTH = 512;
const HEIGHT = 384;
const BYTES_PER_PIXEL = 4;

let buffer = new ImageData(WIDTH, HEIGHT);
let clearColor = Uint8Array.of(0xDD, 0xDD, 0xDD, 0xFF);

let verticesXBuf = new Uint32Array(3);
let verticesYBuf = new Uint32Array(3);

function renderScanline(line: number) {
    for (let t = 0; t < tris.length; t++) {
        let tri = tris[t];

        let topCompat = false;
        let bottomCompat = false;
        for (let v = 0; v < 3; v++) {
            // While determining scanline visibility, also place vertices into temporary buffers
            verticesXBuf[v] = tri.verticesX[v];
            verticesYBuf[v] = tri.verticesY[v];

            if (line >= tri.verticesY[v]) {
                topCompat = true;
            }
            if (line <= tri.verticesY[v]) {
                bottomCompat = true;
            }
        }

        // console.log(`${verticesXBuf[0]}, ${verticesXBuf[1]}, ${verticesXBuf[2]}`);

        if (topCompat && bottomCompat) {
            let leftEdge0X = verticesXBuf[0];
            let leftEdge1X = verticesXBuf[1];
            let leftEdge0Y = verticesYBuf[0];
            let leftEdge1Y = verticesYBuf[1];

            let rightEdge0X = verticesXBuf[1];
            let rightEdge1X = verticesXBuf[2];
            let rightEdge0Y = verticesYBuf[1];
            let rightEdge1Y = verticesYBuf[2];

            let leftEdgeHeight = abs(leftEdge1Y - leftEdge0Y);
            let rightEdgeHeight = abs(rightEdge1Y - rightEdge0Y);

            let leftEdgeStartY = min(leftEdge1Y, leftEdge0Y);
            let rightEdgeStartY = min(rightEdge1Y, rightEdge0Y);

            let leftEdgeRelativeY = abs(line - leftEdgeStartY);
            let rightEdgeRelativeY = abs(line - rightEdgeStartY);

            let leftEdgeXRatio = abs(leftEdgeRelativeY / leftEdgeHeight);
            let rightEdgeXRatio = abs(rightEdgeRelativeY / rightEdgeHeight);

            // console.log(`left  X ratio: ${leftEdgeXRatio}`)
            // console.log(`right X ratio: ${rightEdgeXRatio}`)

            // console.log(`left X: ${leftEdge0X}`)

            let leftEdgeLerped = lerp(leftEdge1X, leftEdge0X, leftEdgeXRatio);
            let rightEdgeLerped = lerp(rightEdge0X, rightEdge1X, rightEdgeXRatio);

            let leftEdgeTriRatio = 1 - (leftEdgeLerped % 1);
            let rightEdgeTriRatio = rightEdgeLerped % 1;

            let leftEdgeLerpedRounded = leftEdgeLerped | 0;
            let rightEdgeLerpedRounded = rightEdgeLerped | 0;

            // console.log(`lerped left  X: ${leftEdgeLerped}`)
            // console.log(`lerped right X: ${rightEdgeLerped}`)

            let lineLength = rightEdgeLerpedRounded - leftEdgeLerpedRounded;
            // console.log(`length: ${lineLength}`)

            // pls mr runtime, round down...
            let base = ((line * WIDTH) + (leftEdgeLerpedRounded + 1 | 0)) * BYTES_PER_PIXEL;

            const c0 = (tri.colors[0] >> 24) & 0xFF;
            const c1 = (tri.colors[0] >> 16) & 0xFF;
            const c2 = (tri.colors[0] >> 8) & 0xFF;
            const c3 = (tri.colors[0] >> 0) & 0xFF;

            // put left pixel in
            buffer.data[base + 0] = lerp(buffer.data[base + 0], c0, leftEdgeTriRatio);
            buffer.data[base + 1] = lerp(buffer.data[base + 1], c1, leftEdgeTriRatio);
            buffer.data[base + 2] = lerp(buffer.data[base + 2], c2, leftEdgeTriRatio);
            buffer.data[base + 3] = lerp(buffer.data[base + 3], c3, leftEdgeTriRatio);
            base += 4;

            for (let p = 0; p < lineLength; p++) {
                buffer.data[base + 0] = c0 /* R */ ;
                buffer.data[base + 1] = c1 /* G */ ;
                buffer.data[base + 2] = c2 /* B */ ;
                buffer.data[base + 3] = c3 /* A */ ;
                base += 4;
            }

            buffer.data[base + 0] = lerp(buffer.data[base + 0], c0, rightEdgeTriRatio);
            buffer.data[base + 1] = lerp(buffer.data[base + 1], c1, rightEdgeTriRatio);
            buffer.data[base + 2] = lerp(buffer.data[base + 2], c2, rightEdgeTriRatio);
            buffer.data[base + 3] = lerp(buffer.data[base + 3], c3, rightEdgeTriRatio);
            base += 4;

            // put right pixel in 
        }
    }
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

    let ratio = (Math.sin(time / 1000) + 1) / 2;
    let x = lerp(0, 400, ratio);

    tris[0] = new Triangle(
        128, 344, // bottom left
        x, 40,  // top
        384, 344, // bottom right

        0xFF0000FF,
        0xFF0000FF,
        0xFF0000FF,
    );

    for (let line = 0; line < HEIGHT; line++) {
        renderScanline(line);
    }

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

function abs(in0: number): number {
    if (in0 < 0) return in0 * -1;
    return in0;
}