// marchingWasm.js
// implemetation of marching cubes using c compiled to wasm

export {setupWasm, generateMeshWasm};

const totalMemory = 268435456;
const maxMemRatio = 0.9;

var memory;
var getMesh;
var getCode;
var assignDataLocation;
var getVertsLocation;
var getIndicesLocation;
var getNormalsLocation;
var getIndicesLength;
var freeMem;

var dataLoc;


var setupWasm = function(dataObj) {
    return new Promise((resolve) => {
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
        WebAssembly.instantiateStreaming(fetch("./src/test.wasm"), imports).then((obj) => {
            memory = obj.instance.exports.memory;
            getMesh = obj.instance.exports.generateMesh;
            getCode = obj.instance.exports.getCode;
            assignDataLocation = obj.instance.exports.assignDataLocation;
            getVertsLocation = obj.instance.exports.getVertsLocation;
            getIndicesLocation = obj.instance.exports.getIndicesLocation;
            getNormalsLocation = obj.instance.exports.getNormalsLocation;
            getIndicesLength = obj.instance.exports.getIndicesLength;
            freeMem = obj.instance.exports.freeMem;
            // check if there is enough room to store the data + codes
            if (dataObj.volume*4*2/totalMemory > maxMemRatio) {
                // not enough room to store the data and codes on theor own
                console.error("Data setting failed, not enough memory in wasm instance");
                resolve();
            } else {
            //send data to wasm object
                dataLoc = assignDataLocation(dataObj.size[0], dataObj.size[1], dataObj.size[2]);
                
                const dataArray = new Float32Array(memory.buffer, dataLoc, dataObj.volume);
                dataArray.set(Float32Array.from(dataObj.data));
                for (let i = 0; i < dataObj.volume; i++) {
                    if (dataArray[i] > 255) {
                        console.log("bigger");
                    } else if (dataArray[i] < 0) {
                        console.log("smaller");
                    }
                }
                resolve();
            };
        });
    });
};

var generateMeshWasm = function(dataObj, meshObj, threshold) {
    // get the length of the vertices and indices to estimate wether the memory
    
    const vertsNumber = getMesh(threshold);
    const indicesNumber = getIndicesLength();

    const vertsLoc = getVertsLocation();
    const indicesLoc = getIndicesLocation();
    const normalsLoc = getNormalsLocation();

    meshObj.verts = new Float32Array(memory.buffer, vertsLoc, vertsNumber*3);
    meshObj.indices = new Uint32Array(memory.buffer, indicesLoc, indicesNumber);
    meshObj.normals = new Float32Array(memory.buffer, normalsLoc, vertsNumber*3);

    // calculate the total used space: data, code, verts + normals, indices
    const used = dataObj.volume*4 + (dataObj.size[0]-1)*(dataObj.size[1]-1)*(dataObj.size[2]-1)*4 + vertsNumber*3*4*2 + indicesNumber*4;

    console.log(Math.round(used/totalMemory*100) + "% wasm mem used");
    //console.log(vertsNumber/indicesNumber);

    freeMem();
}

// var generateMeshWasm = function(dataObj, meshObj, threshold) {
//     generateCodes();
//     // get the length of the vertices and indices to estimate wether the memory
//     const vertsNumber = getVertsNumber(dataObj.size[0], dataObj.size[1], dataObj.size[2], threshold);
//     const indicesNumber = getIndicesLength(dataObj.size[0], dataObj.size[1], dataObj.size[2], threshold);

//     const used = dataObj.volume*4 + (dataObj.size[0]-1)*(dataObj.size[1]-1)*(dataObj.size[2]-1)*4 + vertsNumber*3*4*2 + indicesNumber*4;

//     console.log(Math.round(used/totalMemory*100) + "% wasm mem used");
    
//     if (used/totalMemory > maxMemRatio) {
//         // not enough room to generate mesh
//         console.error("not enough memory to generate mesh");
//     } else {
//         getMesh(dataObj.size[0], dataObj.size[1], dataObj.size[2], threshold);
        
//         const vertsLoc = getVertsLocation();
//         const indicesLoc = getIndicesLocation();
//         const normalsLoc = getNormalsLocation();

//         meshObj.verts = new Float32Array(memory.buffer, vertsLoc, vertsNumber*3);
//         meshObj.indices = new Uint32Array(memory.buffer, indicesLoc, indicesNumber);
//         meshObj.normals = new Float32Array(memory.buffer, normalsLoc, vertsNumber*3);

//         freeMem();
//     }
// }