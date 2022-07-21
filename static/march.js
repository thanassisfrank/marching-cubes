// march.js
// handles the interface between main program and marching apis
// chooses which to use depending on availability
import * as gpu from "./webGPU.js";
import * as wasm from "./marchingWasm.js";
import * as js from "./marching.js";

export {autoSetMarchModule, setMarchModule, getMarchModule, updateBuffersNeeded, setupMarchModule, setupMarch, march, marchMulti, marchFine, module};

var module;

function autoSetMarchModule() {
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


function updateBuffersNeeded() {
    return module != "gpu";
}

function setMarchModule(thisModule) {
    module = thisModule;
}

function getMarchModule() {
    return module;
}

async function setupMarchModule() {
    if (module == "gpu") {
        await gpu.setupMarchModule();
    } else if (module == "wasm") {
        await wasm.setupWasm();
    }
}

async function setupMarch(...args) {
    if (module == "gpu") {
        await gpu.setupMarch(...args)
    } else if (module == "wasm") {
        await wasm.setupData(...args)
    }
}

// called when marching a regular grid of raw data
async function march(...args) {
    if (module == "gpu") {
        await gpu.march(...args);
    } else if (module == "wasm") {
        wasm.generateMeshWasm(...args);
    } else {
        js.generateMesh(...args);
    }
}

async function marchMulti(datas, meshes, threshold) {
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
async function marchFine(...args) {
    if (module == "gpu") {
        await gpu.marchFine(...args);
    }
}