// marchingWasm.js
// implemetation of marching cubes using c compiled to wasm

export {setupWasm, setupData, generateMeshWasm};

const totalMemory = 1073741824;
const maxMemRatio = 0.9;

var WASMModule;
const imports = {
    env: {
        console_log: function(n) {
            console.log(n);
        },
        console_log_bin: function(n) {
            console.log(n.toString(2));
        }
    }
}  

async function setupWasm() {
    WASMModule = await fetch("./src/march.wasm")
        .then(response => response.arrayBuffer())
        .then(bytes => WebAssembly.compile(bytes));
};

async function setupData(dataObj) {
    var obj = await WebAssembly.instantiate(WASMModule, imports);
    console.log(obj);
    var marchData = {};
    marchData.memory = obj.exports.memory;
    marchData.generateMesh = obj.exports.generateMesh;
    marchData.getCode = obj.exports.getCode;
    marchData.assignDataLocation = obj.exports.assignDataLocation;
    marchData.assignPointsLocation = obj.exports.assignPointsLocation;
    marchData.getVertsLocation = obj.exports.getVertsLocation;
    marchData.getIndicesLocation = obj.exports.getIndicesLocation;
    marchData.getIndicesCount = obj.exports.getIndicesCount;
    marchData.freeMem = obj.exports.freeMem;

    // check if there is enough room to store the data (+points)
    var bytesNeeded = dataObj.volume*4;
    if (dataObj.structuredGrid) {
        bytesNeeded *= 4
    }
    if (bytesNeeded/totalMemory > maxMemRatio) {
        // not enough room to store the data and codes on theor own
        console.error("Data setting failed, not enough memory in wasm instance");
        
    } else {
    //send data to wasm object
        const dataLoc = marchData.assignDataLocation(...dataObj.size);
        const dataArray = new Float32Array(marchData.memory.buffer, dataLoc, dataObj.volume);
        console.log(dataObj.data.constructor);
        console.log("loading data to wasm instance");
        if (dataObj.data.constructor != Float32Array) {
            console.log("slow");
            dataArray.set(Float32Array.from(dataObj.data, parseFloat));
        } else {
            dataArray.set(Float32Array.from(dataObj.data));
        }
        console.log("done");

        console.log("data length:", dataObj.data.length);

        if (dataObj.structuredGrid) {
            const pointsLoc = marchData.assignPointsLocation(...dataObj.size);
            const pointsArray = new Float32Array(marchData.memory.buffer, pointsLoc, dataObj.volume*3);
            pointsArray.set(Float32Array.from(dataObj.points));
        }
    };
    dataObj.marchData = marchData;
}

var generateMeshWasm = function(dataObj, meshObj, threshold) {
    // get the length of the vertices and indices to estimate wether the memory
    
    const vertsNumber = dataObj.marchData.generateMesh(threshold, dataObj.structuredGrid);
    const indicesNumber = dataObj.marchData.getIndicesCount();
    //console.log("verts:", vertsNumber);

    const vertsLoc = dataObj.marchData.getVertsLocation();
    const indicesLoc = dataObj.marchData.getIndicesLocation();

    meshObj.verts = new Float32Array(dataObj.marchData.memory.buffer, vertsLoc, vertsNumber*3);
    meshObj.indices = new Uint32Array(dataObj.marchData.memory.buffer, indicesLoc, indicesNumber);
    meshObj.indicesNum = indicesNumber;
    meshObj.vertsNum = vertsNumber;
    //console.log(meshObj);

    // calculate the total used space: data, code, verts + normals, indices
    //const used = dataObj.volume*4 + (dataObj.size[0]-1)*(dataObj.size[1]-1)*(dataObj.size[2]-1)*4 + vertsNumber*3*4*2 + indicesNumber*4;

    //console.log(Math.round(used/totalMemory*100) + "% wasm mem used");

    dataObj.marchData.freeMem();
}