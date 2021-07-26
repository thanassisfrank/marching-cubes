// marchingWasm.js
// implemetation of marching cubes using c compiled to wasm

export {setupWasm, generateMeshWasm};

const totalMemory = 67108864;

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
            
            //send data to wasm object
            dataLoc = assignDataLocation(dataObj.volume);
            
            const dataArray = new Float32Array(memory.buffer, dataLoc, dataObj.volume);
            dataArray.set(dataObj.data);
            
            resolve()
        });
    });
};

var generateMeshWasm = function(dataObj, meshObj, threshold) {
    const vertsNumber = getMesh(dataObj.size[0], dataObj.size[1], dataObj.size[2], threshold);
    const indicesNumber = getIndicesLength();

    const vertsLoc = getVertsLocation();
    const indicesLoc = getIndicesLocation();
    const normalsLoc = getNormalsLocation();

    meshObj.verts = new Float32Array(memory.buffer, vertsLoc, vertsNumber*3);
    meshObj.indices = new Int32Array(memory.buffer, indicesLoc, indicesNumber);
    meshObj.normals = new Float32Array(memory.buffer, normalsLoc, vertsNumber*3);

    //console.log("number of verts:", vertsNumber);
    //console.log("vertices:", verts);
    //console.log("number of indices:", indicesNumber);
    //console.log("indices:", indices);

    // calculate the total used space: data, code, verts + normals, indices
    const used = dataObj.volume*4 + (dataObj.size[0]-1)*(dataObj.size[1]-1)*(dataObj.size[2]-1)*4 + vertsNumber*3*4*2 + indicesNumber*4;

    //console.log(Math.round(used/totalMemory*100) + "% wasm mem used");

    freeMem();
}