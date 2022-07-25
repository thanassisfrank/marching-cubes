// march.js
// handles the interface between main program and marching apis
// chooses which to use depending on availability
import * as gpu from "./webGPU.js";
import * as wasm from "./marchingWasm.js";
import * as js from "./marching.js";

export var module;

export function autoSetMarchModule() {
    if (navigator.gpu) {
        // use webGPU
        module = "gpu";
        console.log("webgpu is supported")
    } else {
        // use wasm
        module = "wasm";
        console.log("webgpu is not supported, using wasm")
    }
}


export function updateBuffersNeeded() {
    return module != "gpu";
}

export function setMarchModule(thisModule) {
    module = thisModule;
}

export function getMarchModule() {
    return module;
}

export async function setupMarchModule() {
    if (module == "gpu") {
        await gpu.setupMarchModule();
    } else if (module == "wasm") {
        await wasm.setupWasm();
    }
}

export async function setupMarch(...args) {
    if (module == "gpu") {
        await gpu.setupMarch(...args)
    } else if (module == "wasm") {
        await wasm.setupData(...args)
    }
}

// called when marching a regular grid of raw data
export async function march(...args) {
    if (module == "gpu") {
        await gpu.march(...args);
    } else if (module == "wasm") {
        wasm.generateMeshWasm(...args);
    } else {
        js.generateMesh(...args);
    }
}

export async function marchMulti(datas, meshes, threshold) {
    if (module == "wasm") {
        var results = [];
        // set off all marches asynchronously
        for (let i = 0; i < datas.length; i++) {
            results.push(march(datas[i], meshes[i], threshold));
        }
        await Promise.all(results);
    } else {
        for (let i = 0; i < datas.length; i++) {
            await march(datas[i], meshes[i], threshold);
        }
    }
}

// called when marching
export async function marchFine(...args) {
    if (module == "gpu") {
        await gpu.marchFine(...args);
    }
}

export async function cleanupMarchData(...args) {
    // wasm instances are garbage collected
}