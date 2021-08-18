// render.js
// handles the interface between main program and rendering apis
// chooses which to use depending on availability
import * as gpu from "./webGPU.js";
import * as gl from "./webgl.js";

export {setRenderModule, setupRenderer, createBuffers, updateBuffers, renderView, deleteBuffers, clearScreen};

var module;

if (navigator.gpu) {
    // use webGPU
    module = "gpu";
    console.log("webgpu is supported")
} else {
    // use webgl
    module = "gl";
    console.log("webgpu is not supported, using webgl")
}

function setRenderModule(thisModule) {
    module = thisModule;
}

function changeModule() {}

function setupRenderer(...args) {
    if (module == "gpu") {
        return gpu.setupRenderer(...args);
    } else {
        return gl.setupRenderer(...args);
    }
}

function createBuffers(...args) {
    if (module == "gpu") {
        return gpu.createBuffers(...args);
    } else {
        return gl.createBuffers(...args);
    }
}

function updateBuffers(...args) {
    if (module == "gpu") {
        return gpu.updateBuffers(...args);
    } else {
        return gl.updateBuffers(...args);
    }
}

function renderView(...args) {
    if (module == "gpu") {
        return gpu.renderView(...args);
    } else {
        return gl.renderView(...args);
    }
}

function deleteBuffers(...args) {
    if (module == "gpu") {
        return gpu.deleteBuffers(...args);
    } else {
        return gl.deleteBuffers(...args);
    }
}

function clearScreen(...args) {
    if (module == "gpu") {
        return gpu.clearScreen(...args);
    } else {
        return gl.clearScreen(...args);
    }
}