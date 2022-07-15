// march.js
// handles the interface between main program and marching apis
// chooses which to use depending on availability
import * as gpu from "./webGPU.js";
import * as wasm from "./marchingWasm.js";
import * as js from "./marching.js";

export {setMarchModule, updateBuffersNeeded, setupMarchModule, setupMarch, march, marchFine, module};

var module;

if (navigator.gpu) {
    // use webGPU
    module = "gpu";
    console.log("webgpu is supported")
} else {
    // use wasm
    module = "wasm";
    console.log("webgpu is not supported, using wasm")
}

function updateBuffersNeeded() {
    return module != "gpu";
}

function setMarchModule(thisModule) {
    module = thisModule;
}

async function setupMarchModule() {
    if (module == "gpu") {
        await gpu.setupMarchModule();
    }
}

async function setupMarch(...args) {
    if (module == "gpu") {
        await gpu.setupMarch(...args)
    } else if (module == "wasm") {
        await wasm.setupWasm(...args)
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

// called when marching
async function marchFine(...args) {
    if (module == "gpu") {
        await gpu.marchFine(...args);
    }
}

// called when marching a .vlc file
async function marchStructuredGrid(...args) {
    
}