interface Window {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

let crossVertIndex = 0;

let crossX = 0;
let crossY = 0;

let triangle0Z = 0;

window.onload = () => {
    init();

    function dropHandler(ev: Event | any) {
        if (ev.dataTransfer.files[0] instanceof Blob) {
            console.log('File(s) dropped');

            ev.preventDefault();

            let reader = new FileReader();
            reader.onload = function () {
                if (this.result instanceof ArrayBuffer) {
                    let dec = new TextDecoder("utf-8");
                    let newTris = parseObjFile(dec.decode(new Uint8Array(this.result)));

                    for (let i = 0; i < newTris.length; i++) {
                        tris.push(newTris[i]);
                    }
                }
            };
            reader.readAsArrayBuffer(ev.dataTransfer.files[0]);
        }
    }

    function dragoverHandler(ev: Event | any) {
        ev.preventDefault();
    }

    window.addEventListener("drop", dropHandler);
    window.addEventListener("dragover", dragoverHandler);

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
    tris[0].colors[1] = 0x00FF00FF;
    tris[0].colors[2] = 0x0000FFFF;

    canvasElement.onclick = (evt) => {
        tris[0].verticesX[crossVertIndex] = crossX - globalTranslateX;
        tris[0].verticesY[crossVertIndex] = crossY - globalTranslateY;

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

    document.getElementById('fill')!.onclick = e => { fill = (e as any).target.checked; };
    document.getElementById('wireframe')!.onclick = e => { wireframe = (e as any).target.checked; };
    document.getElementById('render-z')!.onclick = e => { renderZ = (e as any).target.checked; };
    document.getElementById('depth-test')!.onclick = e => { depthTest = (e as any).target.checked; };
    document.getElementById('ssao')!.onclick = e => { ssao = (e as any).target.checked; };
    document.getElementById("triangle-0-z")!.oninput = e => { triangle0Z = parseInt((e as any).target.value); };
    document.getElementById("x-slider")!.oninput = e => { globalTranslateX = parseInt((e as any).target.value); };
    document.getElementById("y-slider")!.oninput = e => { globalTranslateY = parseInt((e as any).target.value); };
    document.getElementById("z-slider")!.oninput = e => { globalTranslateZ = parseInt((e as any).target.value); };

    fill = (document.getElementById('fill') as any).checked;
    wireframe = (document.getElementById('wireframe') as any).checked;
    renderZ = (document.getElementById('render-z') as any).checked;
    depthTest = (document.getElementById('depth-test') as any).checked;
    ssao = (document.getElementById('ssao') as any).checked;
    triangle0Z = parseInt((document.getElementById("triangle-0-z") as any).value);
    globalTranslateX = parseInt((document.getElementById("x-slider") as any).value);
    globalTranslateY = parseInt((document.getElementById("y-slider") as any).value);
    globalTranslateZ = parseInt((document.getElementById("z-slider") as any).value);

    requestAnimationFrame(frameDriver);
};

function debug(msg: any) {
    let debugElement = document.getElementById("debug")!;
    debugElement.innerText = msg;
}

class Triangle {
    verticesX = new Int32Array(3);
    verticesY = new Int32Array(3);
    verticesZ = new Int32Array(3);

    colors = new Int32Array(3);

    constructor(
        x0?: number,
        y0?: number,
        z0?: number,
        x1?: number,
        y1?: number,
        z1?: number,
        x2?: number,
        y2?: number,
        z2?: number,

        color0?: number,
        color1?: number,
        color2?: number,
    ) {
        this.verticesX[0] = x0 ?? 0;
        this.verticesY[0] = y0 ?? 0;
        this.verticesZ[0] = z0 ?? 0;
        this.verticesX[1] = x1 ?? 0;
        this.verticesY[1] = y1 ?? 0;
        this.verticesZ[1] = z1 ?? 0;
        this.verticesX[2] = x2 ?? 0;
        this.verticesY[2] = y2 ?? 0;
        this.verticesZ[2] = z2 ?? 0;

        this.colors[0] = color0 ?? 0;
        this.colors[1] = color1 ?? 0;
        this.colors[2] = color2 ?? 0;
    }

    set(
        x0: number,
        y0: number,
        z0: number,
        x1: number,
        y1: number,
        z1: number,
        x2: number,
        y2: number,
        z2: number,

        color0: number,
        color1: number,
        color2: number,
    ) {
        this.verticesX[0] = x0;
        this.verticesY[0] = y0;
        this.verticesZ[0] = z0;
        this.verticesX[1] = x1;
        this.verticesY[1] = y1;
        this.verticesZ[1] = z1;
        this.verticesX[2] = x2;
        this.verticesY[2] = y2;
        this.verticesZ[2] = z2;

        this.colors[0] = color0;
        this.colors[1] = color1;
        this.colors[2] = color2;
    }
}

let tris: Array<Triangle>;
let renderTris: Array<Triangle>;
let renderTrisCount = 0;

const WIDTH = 256;
const HEIGHT = 192;
const BYTES_PER_PIXEL = 4;

let buffer = new ImageData(WIDTH, HEIGHT);
let zBuffer = new Float64Array(WIDTH * HEIGHT);
let gBuffer = new Uint32Array(WIDTH * HEIGHT);
let clearColor = Uint8Array.of(0xDD, 0xDD, 0xDD, 0xFF);
const G_BUFFER_EMPTY_VAL = 2147483647;

let pixelsFilled = 0;

let verticesXBuf = new Float64Array(3);
let verticesYBuf = new Float64Array(3);
let verticesZBuf = new Float64Array(3);

let globalTranslateX = -120;
let globalTranslateY = 0;
let globalTranslateZ = 0;

let ssao = true;
let fill = true;
let wireframe = false;
let renderZ = false;
let depthTest = true;

let lowZ = 0;
let highZ = 0;

function rasterize() {
    lowZ = 0;
    highZ = 0;

    if (fill) {
        for (let t = 0; t < renderTrisCount; t++) {
            let tri = renderTris[t];

            for (let v = 0; v < 3; v++) {
                // Place vertices into temporary buffers
                verticesXBuf[v] = tri.verticesX[v];
                verticesYBuf[v] = tri.verticesY[v];
                verticesZBuf[v] = tri.verticesZ[v];
            }

            let color = tri.colors[0];

            const c3 = (color >> 0) & 0xFF;

            let c00;
            let c01;
            let c02;
            let c10;
            let c11;
            let c12;

            // console.log(`${verticesXBuf[0]}, ${verticesXBuf[1]}, ${verticesXBuf[2]}`);

            // Insertion sort vertices by Y
            let i = 1;
            while (i < 3 /* length */) {
                let j = i;
                while (j > 0 && verticesYBuf[j - 1] > verticesYBuf[j]) {
                    let tempX = verticesXBuf[j];
                    let tempY = verticesYBuf[j];
                    let tempZ = verticesZBuf[j];

                    verticesXBuf[j] = verticesXBuf[j - 1];
                    verticesYBuf[j] = verticesYBuf[j - 1];
                    verticesZBuf[j] = verticesZBuf[j - 1];

                    verticesXBuf[j - 1] = tempX;
                    verticesYBuf[j - 1] = tempY;
                    verticesZBuf[j - 1] = tempZ;

                    j--;
                }
                i++;
            }

            let line = bounds(0, HEIGHT - 1, verticesYBuf[0]);
            let endingLine = verticesYBuf[2];

            for (; line <= endingLine; line++) {
                if (line >= HEIGHT) break;
                // left edge: 0-1 
                // right edge: 0-2 
                let leftEdge0Color = tri.colors[1];
                let leftEdge0X = verticesXBuf[1];
                let leftEdge0Y = verticesYBuf[1];
                let leftEdge0Z = verticesZBuf[1];
                let leftEdge1Color = tri.colors[0];
                let leftEdge1X = verticesXBuf[0];
                let leftEdge1Y = verticesYBuf[0];
                let leftEdge1Z = verticesZBuf[0];

                let rightEdge0Color = tri.colors[0];
                let rightEdge0X = verticesXBuf[0];
                let rightEdge0Y = verticesYBuf[0];
                let rightEdge0Z = verticesZBuf[0];
                let rightEdge1Color = tri.colors[2];
                let rightEdge1X = verticesXBuf[2];
                let rightEdge1Y = verticesYBuf[2];
                let rightEdge1Z = verticesZBuf[2];

                if (line >= leftEdge0Y && !(rightEdge1Y == line && leftEdge0Y == line)) {
                    leftEdge1X = rightEdge1X;
                    leftEdge1Y = rightEdge1Y;
                    leftEdge1Z = rightEdge1Z;
                    leftEdge1Color = rightEdge1Color;

                    let tmp = leftEdge1X;
                    leftEdge1X = leftEdge0X;
                    leftEdge0X = tmp;

                    let tmpColor = leftEdge1Color;
                    leftEdge1Color = leftEdge0Color;
                    leftEdge0Color = tmpColor;

                    let tmpZ = leftEdge1Z;
                    leftEdge1Z = leftEdge0Z;
                    leftEdge0Z = tmpZ;

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

                let leftEdgeColorLerped = lerpColor(leftEdge1Color, leftEdge0Color, leftEdgeXRatio);
                let rightEdgeColorLerped = lerpColor(rightEdge0Color, rightEdge1Color, rightEdgeXRatio);

                let leftEdgeZLerped = lerp(leftEdge1Z, leftEdge0Z, leftEdgeXRatio);
                let rightEdgeZLerped = lerp(rightEdge0Z, rightEdge1Z, rightEdgeXRatio);

                // debug(`
                //     L: ${leftEdgeHeight}
                //     R: ${rightEdgeHeight}
                // `);

                // console.log(`left  X ratio: ${leftEdgeXRatio}`)
                // console.log(`right X ratio: ${rightEdgeXRatio}`)

                // console.log(`left X: ${leftEdge0X}`)

                let leftEdgeLerped = bounds(-1, WIDTH - 1, lerp(leftEdge1X, leftEdge0X, leftEdgeXRatio));
                let rightEdgeLerped = bounds(-1, WIDTH - 1, lerp(rightEdge0X, rightEdge1X, rightEdgeXRatio));

                // If the left is to the right of the right for some reason, swap left and right
                // (allow arbitrary winding order)
                if (leftEdgeLerped >= rightEdgeLerped) {
                    let tmp = rightEdgeLerped;
                    rightEdgeLerped = leftEdgeLerped;
                    leftEdgeLerped = tmp;

                    let tmpColor = rightEdgeColorLerped;
                    rightEdgeColorLerped = leftEdgeColorLerped;
                    leftEdgeColorLerped = tmpColor;

                    let tmpZ = rightEdgeZLerped;
                    rightEdgeZLerped = leftEdgeZLerped;
                    leftEdgeZLerped = tmpZ;
                }

                c00 = (leftEdgeColorLerped >> 24) & 0xFF;
                c01 = (leftEdgeColorLerped >> 16) & 0xFF;
                c02 = (leftEdgeColorLerped >> 8) & 0xFF;
                c10 = (rightEdgeColorLerped >> 24) & 0xFF;
                c11 = (rightEdgeColorLerped >> 16) & 0xFF;
                c12 = (rightEdgeColorLerped >> 8) & 0xFF;

                let leftEdgeLerpedRounded = leftEdgeLerped | 0;
                let rightEdgeLerpedRounded = rightEdgeLerped | 0;

                // console.log(`lerped left  X: ${leftEdgeLerped}`)
                // console.log(`lerped right X: ${rightEdgeLerped}`)

                let lineLength = rightEdgeLerpedRounded - leftEdgeLerpedRounded;
                // console.log(`length: ${lineLength}`)

                // pls mr runtime, round down...
                let zBase = ((line * WIDTH) + (leftEdgeLerpedRounded | 0));
                let base = zBase * BYTES_PER_PIXEL;

                base += 4;
                zBase += 1;

                if (!renderZ) {
                    for (let p = 0; p < lineLength; p++) {
                        let lineFactor = p / lineLength;
                        let z = lerp(leftEdgeZLerped, rightEdgeZLerped, lineFactor);

                        if (z < zBuffer[zBase] || !depthTest) {
                            let c0 = lerp(c00, c10, lineFactor);
                            let c1 = lerp(c01, c11, lineFactor);
                            let c2 = lerp(c02, c12, lineFactor);

                            let factor = 1;

                            buffer.data[base + 0] = lerp(buffer.data[base + 0], c0, c3 / 0xFF) * factor; /* R */;
                            buffer.data[base + 1] = lerp(buffer.data[base + 1], c1, c3 / 0xFF) * factor; /* G */;
                            buffer.data[base + 2] = lerp(buffer.data[base + 2], c2, c3 / 0xFF) * factor; /* B */;

                            zBuffer[zBase] = z;
                            gBuffer[zBase] = t;
                        }

                        base += 4;
                        zBase += 1;
                    }
                } else {
                    for (let p = 0; p < lineLength; p++) {
                        let lineFactor = p / lineLength;
                        let z = lerp(leftEdgeZLerped, rightEdgeZLerped, lineFactor);

                        if (z < zBuffer[zBase] || !depthTest) {
                            let renderZ = z;
                            if (renderZ < lowZ) lowZ = renderZ;
                            if (renderZ > highZ) highZ = renderZ;
                            renderZ -= lowZ;
                            renderZ *= (255 / (highZ - lowZ));

                            buffer.data[base + 0] = renderZ;
                            buffer.data[base + 1] = renderZ;
                            buffer.data[base + 2] = renderZ;

                            zBuffer[zBase] = z;
                        }

                        base += 4;
                        zBase += 1;
                    }
                }

                pixelsFilled += lineLength;
            }
        }
    }

    if (wireframe) {
        for (let t = 0; t < renderTrisCount; t++) {
            let tri = renderTris[t];

            // let color = tri.colors[0];

            // const c0 = (color >> 24) & 0xFF;
            // const c1 = (color >> 16) & 0xFF;
            // const c2 = (color >> 8) & 0xFF;
            // const c3 = (color >> 0) & 0xFF;

            // const lc0 = lerp(c0, 0xFF, 0.5);
            // const lc1 = lerp(c1, 0xFF, 0.5);
            // const lc2 = lerp(c2, 0xFF, 0.5);

            // let lineColor = ((c0 << 0) | (c1 << 8) | (c2 << 16) | (c3 << 24)) ^ 0xFFFFFF00;

            drawLine(tri.verticesX[0], tri.verticesY[0], tri.verticesX[1], tri.verticesY[1], 0x000000FF);
            drawLine(tri.verticesX[1], tri.verticesY[1], tri.verticesX[2], tri.verticesY[2], 0x000000FF);
            drawLine(tri.verticesX[2], tri.verticesY[2], tri.verticesX[0], tri.verticesY[0], 0x000000FF);
        }
    }
}

let a = 1;
let b = 0.5;

function applySsao() {
    let screenIndex = 0;
    for (let p = 0; p < WIDTH * HEIGHT; p++) {
        if (gBuffer[p] != G_BUFFER_EMPTY_VAL) {
            let core = zBuffer[p];
            let occlusion = 0;

            // Sample 5x5 area - index up 2 and left 2 
            let index = (p - (WIDTH * 2)) - 2;
            if (index < 0) {
                screenIndex += 4;
                continue;
            }

            for (let i = 0; i < 5; i++) {
                let subIndex = index;
                for (let j = 0; j < 5; j++) {
                    if (index > WIDTH * HEIGHT) {
                        subIndex++;
                        continue;
                    }
                    if (gBuffer[subIndex] != G_BUFFER_EMPTY_VAL) {
                        let depth = zBuffer[subIndex++];
                        const threshold = 0;
                        let diff = abs(depth - core);
                        if (diff > threshold) {
                            diff *= smoothstep(0.5, 0, (diff + threshold) / 128);
                        }
                        occlusion += diff;
                    } else {
                        subIndex++;
                    }
                }
                index += WIDTH;
            }

            let factor = max(0, occlusion) / 2;

            buffer.data[screenIndex + 0] = buffer.data[screenIndex + 0] - factor;
            buffer.data[screenIndex + 1] = buffer.data[screenIndex + 1] - factor;
            buffer.data[screenIndex + 2] = buffer.data[screenIndex + 2] - factor;
        }

        screenIndex += 4;
    }
}



// Implementation of Bresenham's line algorithm
function drawLine(x0: number, y0: number, x1: number, y1: number, color: number) {
    let low: boolean;
    let swap: boolean;
    let dx0: number;
    let dy0: number;
    let dx1: number;
    let dy1: number;

    if (abs(y1 - y0) < abs(x1 - x0)) {
        low = true;
        swap = x0 > x1;
    } else {
        low = false;
        swap = y0 > y1;
    }

    if (swap) {
        dx0 = x1;
        dy0 = y1;
        dx1 = x0;
        dy1 = y0;
    } else {
        dx0 = x0;
        dy0 = y0;
        dx1 = x1;
        dy1 = y1;
    }

    if (low) {
        let dx = dx1 - dx0;
        let dy = dy1 - dy0;

        let yi = 1;

        if (dy < 0) {
            yi = -1;
            dy = -dy;
        }

        let d = (2 * dy) - dx;
        let y = dy0;

        for (let x = dx0; x <= dx1; x++) {
            setPixel(x, y, color);
            if (d > 0) {
                y = y + yi;
                d = d + (2 * (dy - dx));
            } else {
                d = d + 2 * dy;
            }
            pixelsFilled++;
        }
    } else {
        let dx = dx1 - dx0;
        let dy = dy1 - dy0;

        let xi = 1;

        if (dx < 0) {
            xi = -1;
            dx = -dx;
        }

        let d = (2 * dx) - dy;
        let x = dx0;

        for (let y = dy0; y <= dy1; y++) {
            setPixel(x, y, color);
            if (d > 0) {
                x = x + xi;
                d = d + (2 * (dx - dy));
            } else {
                d = d + 2 * dx;
            }
            pixelsFilled++;
        }
    }
}

let col = 0x000000FF;
function drawCrosshair() {
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
            let x = tri.verticesX[v] | 0;
            let y = tri.verticesY[v] | 0;
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
    if (y >= HEIGHT) return;

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
        zBuffer[i] = 2147483647;
        gBuffer[i] = G_BUFFER_EMPTY_VAL;
    }
    pixelsFilled += WIDTH * HEIGHT;
}

function display() {
    window.ctx.putImageData(buffer, 0, 0);
}

function init() {
    tris = new Array(4).fill(0).map(
        () => new Triangle(
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,

            0xFF0000FF,
            0xFF0000FF,
            0xFF0000FF
        )
    );

    renderTris = new Array(4);
}

let time = 0;
function frame(delta: DOMHighResTimeStamp) {
    time += delta;
    // let ratio = (Math.sin(time / 1000) + 1) / 2;
    // let x = lerp(0, 400, ratio);

    // clockwise winding order
    // tris[0].set(
    //     96, 64, 0,
    //     160, 128, 0,
    //     96, 128, 0,

    //     0xFF7F7FFF,
    //     0xFF7F7FFF,
    //     0xFF7F7FFF,
    // );

    // tris[1].set(
    //     96, 64, 0,
    //     160, 64, 0,
    //     160, 128, 0,

    //     0xFF7F7FFF,
    //     0xFF7F7FFF,
    //     0xFF7F7FFF,
    // );

    // tris[2].set(
    //     32 + 96, 64, 20,
    //     32 + 160, 128, 20,
    //     32 + 96, 128, 20,

    //     0x7FFF7FFF,
    //     0x7FFF7FFF,
    //     0x7FFF7FFF,
    // );

    // tris[3].set(
    //     32 + 96, 64, 20,
    //     32 + 160, 64, 20,
    //     32 + 160, 128, 20,

    //     0x7FFF7FFF,
    //     0x7FFF7FFF,
    //     0x7FFF7FFF,
    // );

    // 79.57741211: 1 rotation per second
    // let speedMul = 0.5;
    // // let rad = time / (Math.PI * 2 * 79.57741211 / speedMul);



    // let triangle0Z = Math.sin(time / (100000 * 10)) * 50;
    tris[0].verticesZ[0] = triangle0Z;
    tris[0].verticesZ[1] = triangle0Z;
    tris[0].verticesZ[2] = triangle0Z;

    // let rad = toRadians(parseInt((document.getElementById("slider")! as HTMLInputElement).value)) / (Math.PI * 2);
    // let sin = Math.sin(rad);
    // let cos = Math.cos(rad);
    // rotate(tris[0], WIDTH / 2, HEIGHT / 2, sin * 2, cos * 2);
    // rotate(tris[1], WIDTH / 2, HEIGHT / 2, sin * 2, cos * 2);
    // rotate(tris[2], (WIDTH / 2) + 64, HEIGHT / 2, sin, cos);
    // rotate(tris[3], (WIDTH / 2) + 64, HEIGHT / 2, sin, cos);
    // rotate(tris[2], (WIDTH / 2) + 16, HEIGHT / 2, sin / 2, cos / 2);
    // rotate(tris[3], (WIDTH / 2) + 16, HEIGHT / 2, sin / 2, cos / 2);

    // `[${matrixTruncater(cos)}, ${matrixTruncater(-sin)}]
    // [${matrixTruncater(sin)}, ${matrixTruncater(cos)}]
    // debug(`
    // Pixels filled: ${pixelsFilled}`
    // );

    processTransformations();
    rasterize();
    if (ssao) applySsao();

    // drawDots();
    drawCrosshair();

    display();
    clear();
}

function processTransformations() {
    renderTrisCount = 0;
    for (let i = 0; i < tris.length; i++) {
        if (renderTris[i] == null) {
            renderTris[i] = new Triangle();
        }
        let preTri = tris[i];

        const HALF_WIDTH = WIDTH / 2;
        const HALF_HEIGHT = HEIGHT / 2;

        let renderTri = renderTris[i];
        for (let j = 0; j < 3; j++) {
            let centeredX = (preTri.verticesX[j] + globalTranslateX) - HALF_WIDTH;
            let centeredY = (preTri.verticesY[j] + globalTranslateY) - HALF_HEIGHT;
            let z = preTri.verticesZ[j] - globalTranslateZ;
            renderTri.verticesX[j] = (centeredX / ((z / 100) + 1)) + HALF_WIDTH;
            renderTri.verticesY[j] = (centeredY / ((z / 100) + 1)) + HALF_HEIGHT;
            renderTri.verticesZ[j] = preTri.verticesZ[j];
            renderTri.colors[j] = preTri.colors[j];
        }

        renderTrisCount++;
    }
}

function frameDriver(time: DOMHighResTimeStamp) {
    frame(time);
    requestAnimationFrame(frameDriver);
}

function lerp(in0: number, in1: number, factor: number) {
    return (1 - factor) * in0 + factor * in1;
}

function lerpColor(in0: number, in1: number, factor: number) {
    const c00 = (in0 >> 24) & 0xFF;
    const c01 = (in0 >> 16) & 0xFF;
    const c02 = (in0 >> 8) & 0xFF;
    const c03 = (in0 >> 0) & 0xFF;

    const c10 = (in1 >> 24) & 0xFF;
    const c11 = (in1 >> 16) & 0xFF;
    const c12 = (in1 >> 8) & 0xFF;
    const c13 = (in1 >> 0) & 0xFF;

    return (lerp(c00, c10, factor) << 24) |
        (lerp(c01, c11, factor) << 16) |
        (lerp(c02, c12, factor) << 8) |
        (lerp(c03, c13, factor) << 0);
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

function transform(tri: Triangle, originX: number, originY: number, m0: number, m1: number, m2: number, m3: number) {
    for (let i = 0; i < 3; i++) {
        let origX = tri.verticesX[i];
        let origY = tri.verticesY[i];
        // Apply 2x2 matrix multiplication
        tri.verticesX[i] = originX + ((origX - originX) * m0 + (origY - originY) * m1);
        tri.verticesY[i] = originY + ((origX - originX) * m2 + (origY - originY) * m3);
    }
}

function rotate(tri: Triangle, originX: number, originY: number, sin: number, cos: number) {
    transform(tri, originX, originY, cos, -sin, sin, cos);
}

function toDegrees(radians: number) {
    return radians * (180 / Math.PI);
}


function toRadians(deg: number) {
    return deg / (Math.PI * 2);
}

function matrixTruncater(num: number): string {
    let trunc = 10000;
    if (num < 0) trunc = 1000;
    return r_pad((((num * trunc) | 0) / trunc).toString(), 6, '0');
}

function smoothstep(edge0: number, edge1: number, x: number) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * (3 - 2 * x);
}

function clamp(x: number, lowerlimit: number, upperlimit: number) {
    if (x < lowerlimit)
        x = lowerlimit;
    if (x > upperlimit)
        x = upperlimit;
    return x;
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

class Vec2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class ObjVertexRef {
    v: number;
    vt: number;
    vn: number;

    constructor(v: number, vt: number, vn: number) {
        this.v = v;
        this.vt = vt;
        this.vn = vn;
    }
}

class ObjVertex {
    position: Vec3;
    texCoord: Vec2;
    normal: Vec3;

    constructor(position: Vec3, texCoord: Vec2, normal: Vec3) {
        this.position = position;
        this.texCoord = texCoord;
        this.normal = normal;
    }
}

class ObjFile {
    positionArr: Vec3[];
    texCoordArr: Vec2[];
    normalArr: Vec3[];

    constructor(positionArr: Vec3[], texCoordArr: Vec2[], normalArr: Vec3[]) {
        this.positionArr = positionArr;
        this.texCoordArr = texCoordArr;
        this.normalArr = normalArr;
    }
}

function parseObjFile(objFile: string) {
    let triangleArr: Triangle[] = [];

    console.log("Loading OBJ...");
    // console.log(objFile);

    let splitObjFile = objFile.split('\n');
    let lineIndex = 0;

    let positionArr: Vec3[] = [];
    let texCoordArr: Vec2[] = [];
    let normalArr: Vec3[] = [];

    while (lineIndex < splitObjFile.length) {
        let line = splitObjFile[lineIndex++];
        let splitLine = line.split(' ');
        // console.log(line);
        let splitLineIndex = 0;

        let prefix = splitLine[splitLineIndex++];

        if (prefix == "v") {
            let x = parseDec(splitLine[splitLineIndex++]);
            let y = parseDec(splitLine[splitLineIndex++]);
            let z = parseDec(splitLine[splitLineIndex++]);
            positionArr.push(new Vec3(x, y, z));

            // console.log(`parsed v: X:${x} X:${y} Z:${z}`);
        }

        if (prefix == "f") {
            let vArray: number[] = [];
            while (splitLineIndex < splitLine.length) {
                vArray.push(parseDec(splitLine[splitLineIndex++]) - 1);
            }

            let refs = [vArray[0], vArray[1], vArray[2]];
            for (let i = 1; i + 1 < vArray.length; i++) {
                refs[1] = vArray[i];
                refs[2] = vArray[i + 1];

                let tri = new Triangle();
                let color = 0x000000FF;
                switch (triangleArr.length % 3) {
                    case 0: color = 0xFF0000FF; break;
                    case 1: color = 0x00FF00FF; break;
                    case 2: color = 0x0000FFFF; break;
                }
                color = 0x7F7F7FFF;
                tri.colors[0] = color;
                tri.colors[1] = color;
                tri.colors[2] = color;
                triangleArr.push(tri);
                for (let j = 0; j < 3; j++) {
                    tri.verticesX[j] = positionArr[refs[j]].x;
                    tri.verticesY[j] = positionArr[refs[j]].y;
                    tri.verticesZ[j] = positionArr[refs[j]].z;
                }
            }
        }
    }

    console.log(`Finalized with ${triangleArr.length} triangles`);
    // for (let i = 0; i < triangleArr.length; i++) {
    //     let t = triangleArr[i];
    // console.log(`1 X:${t.verticesX[0]} X:${t.verticesY[0]} Z:${t.verticesZ[0]}`);
    // console.log(`2 X:${t.verticesX[1]} X:${t.verticesY[1]} Z:${t.verticesZ[1]}`);
    // console.log(`3 X:${t.verticesX[2]} X:${t.verticesY[2]} Z:${t.verticesZ[2]}`);
    // }

    return triangleArr;
}

function parseDec(input: string) {
    return parseInt(input, 10);
}