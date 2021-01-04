interface Window {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

const NEAR_CLIPPING_PLANE = 0;

let normalShading = false;

let crossVertIndex = 0;
let frameCount = 0;
let frameTimeCounterNext = 0;

let crossX = 0;
let crossY = 0;

let triangle0Z = 0;

let zDivisor = 150;
let flySpeedMul = 1;

let lookUp = false;
let lookLeft = false;
let lookDown = false;
let lookRight = false;

let moveUp = false;
let moveDown = false;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let objXFlip = false;
let objYFlip = false;
let objZFlip = false;

let normalYFlip = false;

let shiftLeft = false;

let pointerCaptured = false;

window.onload = () => {
    let infoElement = document.getElementById("info")!;
    let canvasElement = document.getElementById("canvas")! as HTMLCanvasElement;

    canvasElement.onclick = (evt) => {
        if (!pointerCaptured) {
            let x = crossX - cameraTranslateX - HALF_WIDTH;
            let y = crossY - cameraTranslateY - HALF_HEIGHT;
            tris[0].verticesX[crossVertIndex] = x + HALF_WIDTH;
            tris[0].verticesY[crossVertIndex] = y + HALF_HEIGHT;

            // tris[0].verticesX[crossVertIndex] = crossX - globalTranslateX;
            // tris[0].verticesY[crossVertIndex] = crossY - globalTranslateY;

            crossVertIndex++;

            if (crossVertIndex >= 3) {
                crossVertIndex = 0;
            }
        }
    };

    canvasElement.width = WIDTH;
    canvasElement.height = HEIGHT;
    canvasElement.style.width = (WIDTH * SCREEN_SCALE).toString();
    canvasElement.style.height = (HEIGHT * SCREEN_SCALE).toString();

    document.onpointerlockchange = () => {
        pointerCaptured = document.pointerLockElement == canvasElement;
    };

    document.addEventListener("wheel", e => {
        if (pointerCaptured) {
            flySpeedMul += -e.deltaY / 250;
            flySpeedMul = bounds(0, 10, flySpeedMul);
            e.preventDefault();
        }
    }, { passive: false });

    canvasElement.style.cursor = "none";
    canvasElement.onmousemove = (evt) => {
        if (pointerCaptured) {
            cameraRotateY += evt.movementX * 0.25;
            cameraRotateX += evt.movementY * 0.25;

            cameraRotateY %= 360;
            cameraRotateX = bounds(-90, 90, cameraRotateX);
        } else {
            let ratio = canvasElement.clientWidth / WIDTH;

            let rect = canvasElement.getBoundingClientRect();

            crossX = ((evt.clientX - rect.left) / ratio) | 0;
            crossY = ((evt.clientY - rect.top) / ratio) | 0;

            infoElement.innerText = `
            Pos X: ${crossX}
            Pos Y: ${crossY}
    
            Set Vertex ${crossVertIndex}
            `;
        }
    };

    function keyEvent(key: string, val: boolean) {
        switch (key) {
            case "KeyE": moveUp = val; break;
            case "KeyQ": moveDown = val; break;
            case "KeyW": moveForward = val; break;
            case "KeyS": moveBackward = val; break;
            case "KeyA": moveLeft = val; break;
            case "KeyD": moveRight = val; break;
            case "ArrowLeft": lookLeft = val; break;
            case "ArrowRight": lookRight = val; break;
            case "ArrowUp": lookUp = val; break;
            case "ArrowDown": lookDown = val; break;
            case "ShiftLeft": shiftLeft = val; break;
        }
    }

    let block = ["KeyQ", "KeyE", "KeyW", "KeyS", "KeyA", "KeyD", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "ShiftLeft", "Backquote"];

    document.onkeydown = function (e) {
        if (block.includes(e.key)) {
            e.preventDefault();
        }

        switch (e.code) {
            case "Backquote":
                if (shiftLeft) {
                    canvasElement.requestPointerLock();
                }
                break;
        }

        keyEvent(e.code, true);
    };
    document.onkeyup = function (e) {
        if (block.includes(e.key)) {
            e.preventDefault();
        }

        keyEvent(e.code, false);
    };

    function dropHandler(ev: Event | any) {
        if (ev.dataTransfer.files[0] instanceof Blob) {
            console.log("File(s) dropped");

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

    document.getElementById("rotate")!.onclick = e => { rotate = (e as any).target.checked; };
    document.getElementById("fill")!.onclick = e => { fill = (e as any).target.checked; };
    document.getElementById("wireframe")!.onclick = e => { wireframe = (e as any).target.checked; };
    document.getElementById("render-z")!.onclick = e => { renderZ = (e as any).target.checked; };
    document.getElementById("depth-test")!.onclick = e => { depthTest = (e as any).target.checked; };
    document.getElementById("ssao")!.onclick = e => { ssao = (e as any).target.checked; };
    document.getElementById("perspective-transform")!.onclick = e => { perspectiveTransform = (e as any).target.checked; };
    document.getElementById("normal-shading")!.onclick = e => { normalShading = (e as any).target.checked; };
    document.getElementById("triangle-0-z")!.oninput = e => { triangle0Z = parseInt((e as any).target.value); };
    document.getElementById("x-slider")!.oninput = e => { cameraTranslateX = parseInt((e as any).target.value); };
    document.getElementById("y-slider")!.oninput = e => { cameraTranslateY = parseInt((e as any).target.value); };
    document.getElementById("z-slider")!.oninput = e => { cameraTranslateZ = parseInt((e as any).target.value); };
    document.getElementById("x-rotation")!.oninput = e => { globalRotateX = parseInt((e as any).target.value); };
    document.getElementById("y-rotation")!.oninput = e => { globalRotateY = parseInt((e as any).target.value); };
    document.getElementById("z-rotation")!.oninput = e => { globalRotateZ = parseInt((e as any).target.value); };
    document.getElementById("vertex-dots")!.onclick = e => { vertexDots = (e as any).target.checked; };
    document.getElementById("obj-x-flip")!.onclick = e => { objXFlip = (e as any).target.checked; };
    document.getElementById("obj-y-flip")!.onclick = e => { objYFlip = (e as any).target.checked; };
    document.getElementById("obj-z-flip")!.onclick = e => { objZFlip = (e as any).target.checked; };
    document.getElementById("normal-y-flip")!.onclick = e => { normalYFlip = (e as any).target.checked; };

    rotate = (document.getElementById("rotate") as any).checked;
    fill = (document.getElementById("fill") as any).checked;
    wireframe = (document.getElementById("wireframe") as any).checked;
    renderZ = (document.getElementById("render-z") as any).checked;
    depthTest = (document.getElementById("depth-test") as any).checked;
    ssao = (document.getElementById("ssao") as any).checked;
    perspectiveTransform = (document.getElementById("perspective-transform") as any).checked;
    normalShading = (document.getElementById("normal-shading") as any).checked;
    triangle0Z = parseInt((document.getElementById("triangle-0-z") as any).value);
    cameraTranslateX = parseInt((document.getElementById("x-slider") as any).value);
    cameraTranslateY = parseInt((document.getElementById("y-slider") as any).value);
    cameraTranslateZ = parseInt((document.getElementById("z-slider") as any).value);

    init();

    requestAnimationFrame(frameDriver);
};

function debug(msg: any) {
    let debugElement = document.getElementById("debug")!;
    debugElement.innerText = msg;
}

class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    copyFrom(vec: Vec3) {
        this.x = vec.x;
        this.y = vec.y;
        this.z = vec.z;
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

class VertexData {
    x: number = 0;
    y: number = 0;
    z: number = 0;

    color: number = 0;
}

class Triangle {
    verticesX = new Float64Array(3);
    verticesY = new Float64Array(3);
    verticesZ = new Float64Array(3);

    colors = new Uint32Array(3);

    material = 0;

    normal = new Vec3();

    constructor(
        x0: number = 0,
        y0: number = 0,
        z0: number = 0,
        x1: number = 0,
        y1: number = 0,
        z1: number = 0,
        x2: number = 0,
        y2: number = 0,
        z2: number = 0,

        color0: number = 0,
        color1: number = 0,
        color2: number = 0,

        material: number = 0,
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

        this.material = material;
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

let tmpVec0 = new Vec3();
let tmpVec1 = new Vec3();
function normalOfTriangle(tri: Triangle, vec: Vec3) {
    tmpVec0.x = tri.verticesX[1] - tri.verticesX[0];
    tmpVec0.y = tri.verticesY[1] - tri.verticesY[0];
    tmpVec0.z = tri.verticesZ[1] - tri.verticesZ[0];
    tmpVec1.x = tri.verticesX[2] - tri.verticesX[0];
    tmpVec1.y = tri.verticesY[2] - tri.verticesY[0];
    tmpVec1.z = tri.verticesZ[2] - tri.verticesZ[0];
    crossProduct(tmpVec0, tmpVec1, vec);
    return vec;
}

function angleBetweenVectors(in0: Vec3, in1: Vec3): number {
    return Math.acos(dotProduct(in0, in1) / (lengthOfVector(in0) * lengthOfVector(in1)));
}

function lengthOfVector(vec: Vec3): number {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
}

function normalizeVector(vec: Vec3) {
    let length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    vec.x /= length;
    vec.y /= length;
    vec.z /= length;
    return vec;
}

function normalizeTo1Vector(vec: Vec3) {
    let largest = max(max(vec.x, vec.y), vec.z);
    vec.x /= largest;
    vec.y /= largest;
    vec.z /= largest;
    return vec;
}

function crossProduct(in0: Vec3, in1: Vec3, out: Vec3) {
    let x = (in0.y * in1.z) - (in0.z * in1.y);
    let y = (in0.z * in1.x) - (in0.x * in1.z);
    let z = (in0.x * in1.y) - (in0.y * in1.x);
    out.x = x;
    out.y = y;
    out.z = z;
}

function dotProduct(in0: Vec3, in1: Vec3): number {
    let result = 0;
    result += in0.x * in1.x;
    result += in0.y * in1.y;
    result += in0.z * in1.z;
    return result;
}

let tris: Array<Triangle>;
let renderTris: Array<Triangle>;
let renderTrisCount = 0;

const RESOLUTION_SCALE = 1;
const SCREEN_SCALE = 4;
const WIDTH = 256 * RESOLUTION_SCALE;
const HEIGHT = 192 * RESOLUTION_SCALE;
const HALF_WIDTH = WIDTH / 2;
const HALF_HEIGHT = HEIGHT / 2;
const BYTES_PER_PIXEL = 4;

let buffer = new ImageData(WIDTH, HEIGHT);
let zBuffer = new Float64Array(WIDTH * HEIGHT);
let zBufferAlwaysBlank = new Float64Array(WIDTH * HEIGHT);
let gBuffer = new Uint32Array(WIDTH * HEIGHT);
// let clearColor = Uint8Array.of(0x87, 0xCE, 0xEB, 0xFF);
let clearColor = Uint8Array.of(0, 0, 0, 0xFF);
const G_BUFFER_CLEAR_VAL = 4294967295;
const Z_BUFFER_CLEAR_VAL = 0;

let pixelsFilled = 0;
let linesFilled = 0;

let vertexBuf = new Array(3).fill(0).map(() => new VertexData());

let cameraTranslateX = 0;
let cameraTranslateY = 0;
let cameraTranslateZ = 0;
let cameraRotateX = 0;
let cameraRotateY = 0;
let cameraRotateZ = 0;

let cameraVec = new Vec3();

let globalRotateX = 0;
let globalRotateY = 0;
let globalRotateZ = 0;

let ssao = true;
let vertexDots = false;
let perspectiveTransform = true;
let fill = true;
let rotate = false;
let wireframe = false;
let renderZ = false;
let depthTest = true;

let lowZ = 0;
let highZ = 0;
let activeLowZ = 0;
let activeHighZ = 0;

let tmpVec = new Vec3();
let upVec = new Vec3(0, 1, 0);

function rasterize() {
    activeLowZ = lowZ;
    activeHighZ = highZ;
    lowZ = 0;
    highZ = 0;

    let activeZBuffer = depthTest ? zBuffer : zBufferAlwaysBlank;

    if (fill) {
        triLoop:
        for (let t = 0; t < renderTrisCount; t++) {
            let tri = renderTris[t];
            let materialId = tri.material;

            for (let v = 0; v < 3; v++) {
                // Place vertices into temporary buffers
                vertexBuf[v].x = tri.verticesX[v];
                vertexBuf[v].y = tri.verticesY[v];
                vertexBuf[v].z = tri.verticesZ[v];
                vertexBuf[v].color = tri.colors[v];
            }

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
                while (j > 0 && vertexBuf[j - 1].y > vertexBuf[j].y) {
                    let tmp = vertexBuf[j];
                    vertexBuf[j] = vertexBuf[j - 1];
                    vertexBuf[j - 1] = tmp;

                    j--;
                }
                i++;
            }

            let line = bounds(0, HEIGHT, vertexBuf[0].y);
            let endingLine = bounds(0, HEIGHT, vertexBuf[2].y);

            for (; line < endingLine; line++) {
                // left edge: 0-1 
                // right edge: 0-2 
                let leftEdge0 = vertexBuf[1];
                let leftEdge1 = vertexBuf[0];

                let rightEdge0 = vertexBuf[0];
                let rightEdge1 = vertexBuf[2];

                // if (line == leftEdge0.y) {
                //     vertexBuf[0].color ^= 0xFFFFFF00;
                //     vertexBuf[1].color ^= 0xFFFFFF00;
                //     vertexBuf[2].color ^= 0xFFFFFF00;
                // }

                if (line >= leftEdge0.y && !(rightEdge1.y == line && leftEdge0.y == line)) {
                    leftEdge1 = rightEdge1;

                    let tmp = leftEdge1;
                    leftEdge1 = leftEdge0;
                    leftEdge0 = tmp;
                }

                let leftEdgeHeight = leftEdge1.y - leftEdge0.y;
                let rightEdgeHeight = rightEdge1.y - rightEdge0.y;

                let leftEdgeStartY = min(leftEdge1.y, leftEdge0.y);
                let rightEdgeStartY = min(rightEdge1.y, rightEdge0.y);

                let leftEdgeRelativeY = line - leftEdgeStartY;
                let rightEdgeRelativeY = line - rightEdgeStartY;

                let leftEdgeXRatio = abs(leftEdgeRelativeY / leftEdgeHeight);
                let rightEdgeXRatio = abs(rightEdgeRelativeY / rightEdgeHeight);

                let leftEdgeColorLerped = lerpColor(leftEdge1.color, leftEdge0.color, leftEdgeXRatio);
                let rightEdgeColorLerped = lerpColor(rightEdge0.color, rightEdge1.color, rightEdgeXRatio);

                let leftEdgeZLerped = lerp(leftEdge1.z, leftEdge0.z, leftEdgeXRatio);
                let rightEdgeZLerped = lerp(rightEdge0.z, rightEdge1.z, rightEdgeXRatio);

                let leftEdgeLerped = lerp(leftEdge1.x, leftEdge0.x, leftEdgeXRatio);
                let rightEdgeLerped = lerp(rightEdge0.x, rightEdge1.x, rightEdgeXRatio);

                // debug(`
                //     L: ${leftEdgeHeight}
                //     R: ${rightEdgeHeight}
                // `);

                // console.log(`left  X ratio: ${leftEdgeXRatio}`)
                // console.log(`right X ratio: ${rightEdgeXRatio}`)

                // console.log(`left X: ${leftEdge0X}`)

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

                let lineLengthNoClip = rightEdgeLerped - leftEdgeLerped;

                let z = leftEdgeZLerped;
                let c0 = c00;
                let c1 = c01;
                let c2 = c02;

                let zPerPixel = (rightEdgeZLerped - leftEdgeZLerped) / lineLengthNoClip;
                let c0PerPixel = (c10 - c00) / lineLengthNoClip;
                let c1PerPixel = (c11 - c01) / lineLengthNoClip;
                let c2PerPixel = (c12 - c02) / lineLengthNoClip;

                if (leftEdgeLerped < 0) {
                    z -= zPerPixel * leftEdgeLerped;
                    c0 -= c0PerPixel * leftEdgeLerped;
                    c1 -= c1PerPixel * leftEdgeLerped;
                    c2 -= c2PerPixel * leftEdgeLerped;

                    leftEdgeLerped = 0;
                }

                rightEdgeLerped = bounds(0, WIDTH, rightEdgeLerped);

                let leftEdgeLerpedRounded = leftEdgeLerped | 0;
                let rightEdgeLerpedRounded = rightEdgeLerped | 0;

                // console.log(`lerped left  X: ${leftEdgeLerped}`)
                // console.log(`lerped right X: ${rightEdgeLerped}`)

                let lineLength = rightEdgeLerpedRounded - leftEdgeLerpedRounded;
                // console.log(`length: ${lineLength}`)

                // pls mr runtime, round down...
                let zBase = line * WIDTH + leftEdgeLerpedRounded;
                let base = zBase * BYTES_PER_PIXEL;

                if (!renderZ) {
                    for (; leftEdgeLerpedRounded < rightEdgeLerpedRounded; leftEdgeLerpedRounded++) {
                        if (z >= activeZBuffer[zBase]) {
                            buffer.data[base + 0] = c0; /* R */;
                            buffer.data[base + 1] = c1; /* G */;
                            buffer.data[base + 2] = c2; /* B */;

                            zBuffer[zBase] = z;
                            gBuffer[zBase] = materialId;
                        }

                        z += zPerPixel;
                        c0 += c0PerPixel;
                        c1 += c1PerPixel;
                        c2 += c2PerPixel;

                        base += 4;
                        zBase += 1;
                    }
                } else {
                    for (; leftEdgeLerpedRounded < rightEdgeLerpedRounded; leftEdgeLerpedRounded++) {
                        if (z >= activeZBuffer[zBase]) {
                            let renderZ = z;
                            if (renderZ < lowZ) lowZ = renderZ;
                            if (renderZ > highZ) highZ = renderZ;
                            renderZ -= activeLowZ;
                            renderZ *= (255 / (activeHighZ - activeLowZ));

                            buffer.data[base + 0] = renderZ;
                            buffer.data[base + 1] = renderZ;
                            buffer.data[base + 2] = renderZ;

                            zBuffer[zBase] = z;
                        }

                        z += zPerPixel;

                        base += 4;
                        zBase += 1;
                    }
                }

                pixelsFilled += lineLength;
                linesFilled++;
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

function postProcess() {
    for (let y = 1; y < HEIGHT - 1; y++) {
        let p = (WIDTH * 1) * y + 1;
        let screenIndex = p * 4;
        for (let x = 1; x < WIDTH - 1; x++) {
            if (gBuffer[p] != G_BUFFER_CLEAR_VAL) {
                let core = zBuffer[p];
                let occlusion = 0;

                // SSAO
                // Sample 3x3 area - index up 1 and left 1 
                // const initIndex = (p - (WIDTH * 1)) - 1;
                // let index = initIndex;

                // for (let i = 0; i < 3; i++) {
                //     let subIndex = index;
                //     for (let j = 0; j < 3; j++) {
                //         if (gBuffer[subIndex] != G_BUFFER_CLEAR_VAL) {
                //             let depth = zBuffer[subIndex];
                //             const threshold = 32;
                //             let diff = abs(depth - core);
                //             if (diff > threshold) {
                //                 diff *= smoothstep(1, 0, (diff + threshold) / 64);
                //             }
                //             occlusion += diff;
                //         }

                //         subIndex++;
                //     }
                //     index += WIDTH;
                // }


                // Edge marking
                const materialId = gBuffer[p];
                if (
                    gBuffer[p - 1] > materialId ||
                    gBuffer[p + 1] > materialId ||
                    gBuffer[p + WIDTH] > materialId ||
                    gBuffer[p - WIDTH] > materialId
                ) {
                    const EDGE_VAL = 0x7F;
                    buffer.data[screenIndex + 0] = EDGE_VAL;
                    buffer.data[screenIndex + 1] = EDGE_VAL;
                    buffer.data[screenIndex + 2] = EDGE_VAL;
                } else {
                    let sub = max(0, occlusion) * 2;
                    buffer.data[screenIndex + 0] = buffer.data[screenIndex + 0] - sub;
                    buffer.data[screenIndex + 1] = buffer.data[screenIndex + 1] - sub;
                    buffer.data[screenIndex + 2] = buffer.data[screenIndex + 2] - sub;
                }
            }

            screenIndex += 4;
            p++;
        }
    }
}

// Implementation of Bresenham"s line algorithm
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
        let tri = renderTris[t];
        for (let v = 0; v < 3; v++) {
            let col = tri.colors[v];
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
        zBuffer[i] = Z_BUFFER_CLEAR_VAL;
        gBuffer[i] = G_BUFFER_CLEAR_VAL;
    }
    pixelsFilled += WIDTH * HEIGHT;
}

function display() {
    window.ctx.putImageData(buffer, 0, 0);
}

function init() {
    tris = new Array(1).fill(0).map(
        () => new Triangle(
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,

            0xFF0000FF,
            0x00FF00FF,
            0x0000FFFF
        )
    );

    renderTris = new Array(4);

    tris[0].verticesX[2] = 127 + 1;
    tris[0].verticesY[2] = 27 - 1;
    tris[0].verticesX[1] = 195 + 1;
    tris[0].verticesY[1] = 163 - 1;
    tris[0].verticesX[0] = 59 + 1;
    tris[0].verticesY[0] = 163 - 1;

    for (let i = 0; i < zBufferAlwaysBlank.length; i++) {
        zBufferAlwaysBlank[i] = Z_BUFFER_CLEAR_VAL;
    }
}

let sinY = 0;
let cosY = 0;
let sinX = 0;
let cosX = 0;
let sinZ = 0;
let cosZ = 0;

let movementVector = new Vec3();

let lastTime = 0;

function frame(time: DOMHighResTimeStamp) {
    let deltaTime = time - lastTime;
    lastTime = time;
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

    sinY = Math.sin(toRadians(cameraRotateY));
    cosY = Math.cos(toRadians(cameraRotateY));
    sinX = Math.sin(toRadians(cameraRotateX));
    cosX = Math.cos(toRadians(cameraRotateX));
    sinZ = Math.sin(toRadians(cameraRotateZ));
    cosZ = Math.cos(toRadians(cameraRotateZ));

    movementVector.set(0, 0, 0);

    let moveBy = (deltaTime / 16) * flySpeedMul;
    if (moveUp) cameraTranslateY += moveBy;
    if (moveDown) cameraTranslateY -= moveBy;
    if (moveForward) movementVector.z += moveBy;
    if (moveBackward) movementVector.z -= moveBy;
    if (moveLeft) movementVector.x += moveBy;
    if (moveRight) movementVector.x -= moveBy;

    rotateVecXz(movementVector, sinY, cosY);

    cameraTranslateZ += movementVector.z;
    cameraTranslateX += movementVector.x;

    moveBy = deltaTime / 8;
    if (lookLeft) cameraRotateY -= moveBy;
    if (lookRight) cameraRotateY += moveBy;
    if (lookDown) cameraRotateX += moveBy;
    if (lookUp) cameraRotateX -= moveBy;

    // cameraRotateY += moveBy / 40;

    // let triangle0Z = Math.sin(time / (100000 * 10)) * 50;
    tris[0].verticesZ[0] = triangle0Z;
    tris[0].verticesZ[1] = triangle0Z;
    tris[0].verticesZ[2] = triangle0Z;
    tris[0].material = 12345;

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

    clear();

    processTransformations();
    rasterize();
    if (ssao) postProcess();

    if (vertexDots) drawDots();
    if (!pointerCaptured) drawCrosshair();

    display();

    frameCount++;

    if (time >= frameTimeCounterNext) {
        frameTimeCounterNext += 1000;
        debug(
            `FPS: ${frameCount}
             Lines: ${linesFilled}
             Tris: ${renderTrisCount}
             Pixels: ${pixelsFilled}
             `
        );
        frameCount = 0;
    }

    linesFilled = 0;
    pixelsFilled = 0;
}


let x = 0;
let x2 = 0;
function processTransformations() {
    renderTrisCount = 0;

    if (normalYFlip) {
        upVec.y = -1;
    } else {
        upVec.y = 1;
    }

    cameraVec.x = 0;
    cameraVec.y = 0;
    cameraVec.z = -1;

    if (rotate) {
        rotateVecXz(cameraVec, sinY, cosY);
        rotateVecYz(cameraVec, sinX, cosX);
        rotateVecXy(cameraVec, sinZ, cosZ);
    }

    triLoop:
    for (let i = 0; i < tris.length; i++) {
        if (renderTris[renderTrisCount] == null) {
            renderTris[renderTrisCount] = new Triangle();
        }
        let preTri = tris[i];

        let renderTri = renderTris[renderTrisCount];

        let ratio = 1;
        if (normalShading) {
            normalOfTriangle(preTri, renderTri.normal);
            tmpVec.copyFrom(renderTri.normal);
            ratio = angleBetweenVectors(tmpVec, upVec) / Math.PI;
        }

        for (let j = 0; j < 3; j++) {
            renderTri.verticesX[j] = preTri.verticesX[j];
            renderTri.verticesY[j] = preTri.verticesY[j];
            renderTri.verticesZ[j] = preTri.verticesZ[j];

            renderTri.colors[j] = lerpColor(0x000000FF, preTri.colors[j], ratio);
        }
        renderTri.material = preTri.material;

        if (rotate) {
            rotateTriXz(renderTris[renderTrisCount], HALF_WIDTH - cameraTranslateX, cameraTranslateZ, sinY, cosY);
            rotateTriYz(renderTris[renderTrisCount], HALF_HEIGHT - cameraTranslateY, cameraTranslateZ, sinX, cosX);
            rotateTriXy(renderTris[renderTrisCount], HALF_WIDTH, HALF_HEIGHT, sinZ, cosZ);
        }

        // TODO: Implement frustum culling
        let xzInsideFrustum = true;

        if (perspectiveTransform) {
            for (let j = 0; j < 3; j++) {
                let centeredX = renderTri.verticesX[j] + cameraTranslateX - HALF_WIDTH;
                let centeredY = renderTri.verticesY[j] + cameraTranslateY - HALF_HEIGHT;
                let z = renderTri.verticesZ[j] - cameraTranslateZ;

                let finalX = (centeredX / ((z / (zDivisor * RESOLUTION_SCALE)))) + HALF_WIDTH;
                let finalY = (centeredY / ((z / (zDivisor * RESOLUTION_SCALE)))) + HALF_HEIGHT;

                // If vertex behind clipping plane, skip triangle
                if (z < NEAR_CLIPPING_PLANE) {
                    if (finalX < 0 || finalX >= WIDTH || finalY < 0 || finalY >= HEIGHT) {
                        continue triLoop;
                    }
                }

                renderTri.verticesX[j] = finalX | 0;
                renderTri.verticesY[j] = finalY | 0;
                renderTri.verticesZ[j] = 1 / z;
            }
        } else {
            for (let j = 0; j < 3; j++) {
                renderTri.verticesX[j] = (renderTri.verticesX[j] + cameraTranslateX) | 0;
                renderTri.verticesY[j] = (renderTri.verticesY[j] + cameraTranslateY) | 0;
            }
        }

        if (xzInsideFrustum) renderTrisCount++;
    }
    x += Math.PI / (144 * 4);
    x2 += Math.PI / (144);
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

function transformTriXy(tri: Triangle, originX: number, originY: number, m0: number, m1: number, m2: number, m3: number) {
    for (let i = 0; i < 3; i++) {
        let origX = tri.verticesX[i];
        let origY = tri.verticesY[i];
        tri.verticesX[i] = originX + ((origX - originX) * m0 + (origY - originY) * m1);
        tri.verticesY[i] = originY + ((origX - originX) * m2 + (origY - originY) * m3);
    }
}

function transformTriXz(tri: Triangle, originX: number, originZ: number, m0: number, m1: number, m2: number, m3: number) {
    for (let i = 0; i < 3; i++) {
        let origX = tri.verticesX[i];
        let origZ = tri.verticesZ[i];
        tri.verticesX[i] = originX + ((origX - originX) * m0 + (origZ - originZ) * m1);
        tri.verticesZ[i] = originZ + ((origX - originX) * m2 + (origZ - originZ) * m3);
    }
}

function transformTriYz(tri: Triangle, originY: number, originZ: number, m0: number, m1: number, m2: number, m3: number) {
    for (let i = 0; i < 3; i++) {
        let origY = tri.verticesY[i];
        let origZ = tri.verticesZ[i];
        tri.verticesY[i] = originY + ((origY - originY) * m0 + (origZ - originZ) * m1);
        tri.verticesZ[i] = originZ + ((origY - originY) * m2 + (origZ - originZ) * m3);
    }
}

function rotateTriXy(tri: Triangle, originX: number, originY: number, sin: number, cos: number) {
    transformTriXy(tri, originX, originY, cos, -sin, sin, cos);
}

function rotateTriXz(tri: Triangle, originX: number, originZ: number, sin: number, cos: number) {
    transformTriXz(tri, originX, originZ, cos, -sin, sin, cos);
}

function rotateTriYz(tri: Triangle, originY: number, originZ: number, sin: number, cos: number) {
    transformTriYz(tri, originY, originZ, cos, -sin, sin, cos);
}

function transformVecXy(vec: Vec3, m0: number, m1: number, m2: number, m3: number) {
    let origX = vec.x;
    let origY = vec.y;
    vec.x = origX * m0 + origY * m1;
    vec.y = origX * m2 + origY * m3;
}

function transformVecXz(vec: Vec3, m0: number, m1: number, m2: number, m3: number) {
    let origX = vec.x;
    let origZ = vec.z;
    vec.x = origX * m0 + origZ * m1;
    vec.z = origX * m2 + origZ * m3;
}

function transformVecYz(vec: Vec3, m0: number, m1: number, m2: number, m3: number) {
    let origY = vec.y;
    let origZ = vec.z;
    vec.y = origY * m0 + origZ * m1;
    vec.z = origY * m2 + origZ * m3;
}

function rotateVecXy(vec: Vec3, sin: number, cos: number) {
    transformVecXy(vec, cos, -sin, sin, cos);
}

function rotateVecXz(vec: Vec3, sin: number, cos: number) {
    transformVecXz(vec, cos, -sin, sin, cos);
}

function rotateVecYz(vec: Vec3, sin: number, cos: number) {
    transformVecYz(vec, cos, -sin, sin, cos);
}

function toDegrees(radians: number) {
    return radians * (180 / Math.PI);
}

function toRadians(deg: number) {
    return deg * (Math.PI / 180);
}

function matrixTruncater(num: number): string {
    let trunc = 10000;
    if (num < 0) trunc = 1000;
    return r_pad((((num * trunc) | 0) / trunc).toString(), 6, "0");
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
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function r_pad(n: string, width: number, z: string) {
    z = z || "0";
    n = n + "";
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

function parseObjFile(objFile: string) {
    let triangleArr: Triangle[] = [];

    console.log("Loading OBJ...");
    // console.log(objFile);

    let splitObjFile = objFile.split("\n");
    let lineIndex = 0;

    let positionArr: Vec3[] = [];
    let texCoordArr: Vec2[] = [];
    let normalArr: Vec3[] = [];

    let color = 0xFFFFFFFF;
    let colorIndex = 0;
    let materialId = 1;

    while (lineIndex < splitObjFile.length) {
        let line = splitObjFile[lineIndex++];
        let splitLine = line.split(" ");
        // console.log(line);
        let splitLineIndex = 0;

        let prefix = splitLine[splitLineIndex++];

        if (prefix == "usemtl") {
            switch (colorIndex % 3) {
                case 0: color = 0xFF0000FF; break;
                case 1: color = 0x00FF00FF; break;
                case 2: color = 0x0000FFFF; break;
            }

            colorIndex++;
            materialId++;
        }

        if (prefix == "v") {
            let x = parseFloat(splitLine[splitLineIndex++]);
            let y = parseFloat(splitLine[splitLineIndex++]);
            let z = parseFloat(splitLine[splitLineIndex++]);
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

                // console.log(materialId);

                color = 0xFFFFFFFF;

                tri.colors[0] = color;
                tri.colors[1] = color;
                tri.colors[2] = color;
                tri.material = materialId;
                triangleArr.push(tri);
                for (let j = 0; j < 3; j++) {
                    tri.verticesX[j] = positionArr[refs[j]].x * (objXFlip ? -1 : 1);
                    tri.verticesY[j] = positionArr[refs[j]].y * (objYFlip ? -1 : 1);
                    tri.verticesZ[j] = positionArr[refs[j]].z * (objZFlip ? -1 : 1);
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