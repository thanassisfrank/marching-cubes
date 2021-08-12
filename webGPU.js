// webgpu.js
// handles the webgpu api
// generating mesh and rendering

export {setupMarch, march, setupRenderer, createBuffers, updateBuffers, renderView, deleteBuffers, clearScreen};


const WGSize = {
    x: 4,
    y: 4,
    z: 4
}

const WGPrefixSumCount = 256;

var WGCount = {};

var packing = 4;

const vertCoordTable = [
    0, 0, 0, // 0
    1, 0, 0, // 1
    1, 1, 0, // 2
    0, 1, 0, // 3
    0, 0, 1, // 4
    1, 0, 1, // 5
    1, 1, 1, // 6
    0, 1, 1, // 7
];

// table of active edges for a specific vertex code
// in order
const edgeTable = [
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,3,8,9,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,8,10,-1,-1,-1,-1,-1,-1,
    0,2,9,10,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,8,9,10,-1,-1,-1,-1,-1,-1,-1,
    2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,2,8,11,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,9,11,-1,-1,-1,-1,-1,-1,
    1,2,8,9,11,-1,-1,-1,-1,-1,-1,-1,
    1,3,10,11,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,8,10,11,-1,-1,-1,-1,-1,-1,-1,
    0,3,9,10,11,-1,-1,-1,-1,-1,-1,-1,
    8,9,10,11,-1,-1,-1,-1,-1,-1,-1,-1,
    4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,4,7,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,4,7,8,9,-1,-1,-1,-1,-1,-1,
    1,3,4,7,9,-1,-1,-1,-1,-1,-1,-1,
    1,2,4,7,8,10,-1,-1,-1,-1,-1,-1,
    0,1,2,3,4,7,10,-1,-1,-1,-1,-1,
    0,2,4,7,8,9,10,-1,-1,-1,-1,-1,
    2,3,4,7,9,10,-1,-1,-1,-1,-1,-1,
    2,3,4,7,8,11,-1,-1,-1,-1,-1,-1,
    0,2,4,7,11,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,4,7,8,9,11,-1,-1,-1,
    1,2,4,7,9,11,-1,-1,-1,-1,-1,-1,
    1,3,4,7,8,10,11,-1,-1,-1,-1,-1,
    0,1,4,7,10,11,-1,-1,-1,-1,-1,-1,
    0,3,4,7,8,9,10,11,-1,-1,-1,-1,
    4,7,9,10,11,-1,-1,-1,-1,-1,-1,-1,
    4,5,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,4,5,8,9,-1,-1,-1,-1,-1,-1,
    0,1,4,5,-1,-1,-1,-1,-1,-1,-1,-1,
    1,3,4,5,8,-1,-1,-1,-1,-1,-1,-1,
    1,2,4,5,9,10,-1,-1,-1,-1,-1,-1,
    0,1,2,3,4,5,8,9,10,-1,-1,-1,
    0,2,4,5,10,-1,-1,-1,-1,-1,-1,-1,
    2,3,4,5,8,10,-1,-1,-1,-1,-1,-1,
    2,3,4,5,9,11,-1,-1,-1,-1,-1,-1,
    0,2,4,5,8,9,11,-1,-1,-1,-1,-1,
    0,1,2,3,4,5,11,-1,-1,-1,-1,-1,
    1,2,4,5,8,11,-1,-1,-1,-1,-1,-1,
    1,3,4,5,9,10,11,-1,-1,-1,-1,-1,
    0,1,4,5,8,9,10,11,-1,-1,-1,-1,
    0,3,4,5,10,11,-1,-1,-1,-1,-1,-1,
    4,5,8,10,11,-1,-1,-1,-1,-1,-1,-1,
    5,7,8,9,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,5,7,9,-1,-1,-1,-1,-1,-1,-1,
    0,1,5,7,8,-1,-1,-1,-1,-1,-1,-1,
    1,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,5,7,8,9,10,-1,-1,-1,-1,-1,
    0,1,2,3,5,7,9,10,-1,-1,-1,-1,
    0,2,5,7,8,10,-1,-1,-1,-1,-1,-1,
    2,3,5,7,10,-1,-1,-1,-1,-1,-1,-1,
    2,3,5,7,8,9,11,-1,-1,-1,-1,-1,
    0,2,5,7,9,11,-1,-1,-1,-1,-1,-1,
    0,1,2,3,5,7,8,11,-1,-1,-1,-1,
    1,2,5,7,11,-1,-1,-1,-1,-1,-1,-1,
    1,3,5,7,8,9,10,11,-1,-1,-1,-1,
    0,1,5,7,9,10,11,-1,-1,-1,-1,-1,
    0,3,5,7,8,10,11,-1,-1,-1,-1,-1,
    5,7,10,11,-1,-1,-1,-1,-1,-1,-1,-1,
    5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,5,6,8,10,-1,-1,-1,-1,-1,-1,
    0,1,5,6,9,10,-1,-1,-1,-1,-1,-1,
    1,3,5,6,8,9,10,-1,-1,-1,-1,-1,
    1,2,5,6,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,5,6,8,-1,-1,-1,-1,-1,
    0,2,5,6,9,-1,-1,-1,-1,-1,-1,-1,
    2,3,5,6,8,9,-1,-1,-1,-1,-1,-1,
    2,3,5,6,10,11,-1,-1,-1,-1,-1,-1,
    0,2,5,6,8,10,11,-1,-1,-1,-1,-1,
    0,1,2,3,5,6,9,10,11,-1,-1,-1,
    1,2,5,6,8,9,10,11,-1,-1,-1,-1,
    1,3,5,6,11,-1,-1,-1,-1,-1,-1,-1,
    0,1,5,6,8,11,-1,-1,-1,-1,-1,-1,
    0,3,5,6,9,11,-1,-1,-1,-1,-1,-1,
    5,6,8,9,11,-1,-1,-1,-1,-1,-1,-1,
    4,5,6,7,8,10,-1,-1,-1,-1,-1,-1,
    0,3,4,5,6,7,10,-1,-1,-1,-1,-1,
    0,1,4,5,6,7,8,9,10,-1,-1,-1,
    1,3,4,5,6,7,9,10,-1,-1,-1,-1,
    1,2,4,5,6,7,8,-1,-1,-1,-1,-1,
    0,1,2,3,4,5,6,7,-1,-1,-1,-1,
    0,2,4,5,6,7,8,9,-1,-1,-1,-1,
    2,3,4,5,6,7,9,-1,-1,-1,-1,-1,
    2,3,4,5,6,7,8,10,11,-1,-1,-1,
    0,2,4,5,6,7,10,11,-1,-1,-1,-1,
    0,1,2,3,4,5,6,7,8,9,10,11,
    1,2,4,5,6,7,9,10,11,-1,-1,-1,
    1,3,4,5,6,7,8,11,-1,-1,-1,-1,
    0,1,4,5,6,7,11,-1,-1,-1,-1,-1,
    0,3,4,5,6,7,8,9,11,-1,-1,-1,
    4,5,6,7,9,11,-1,-1,-1,-1,-1,-1,
    4,6,9,10,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,4,6,8,9,10,-1,-1,-1,-1,-1,
    0,1,4,6,10,-1,-1,-1,-1,-1,-1,-1,
    1,3,4,6,8,10,-1,-1,-1,-1,-1,-1,
    1,2,4,6,9,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,4,6,8,9,-1,-1,-1,-1,
    0,2,4,6,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,4,6,8,-1,-1,-1,-1,-1,-1,-1,
    2,3,4,6,9,10,11,-1,-1,-1,-1,-1,
    0,2,4,6,8,9,10,11,-1,-1,-1,-1,
    0,1,2,3,4,6,10,11,-1,-1,-1,-1,
    1,2,4,6,8,10,11,-1,-1,-1,-1,-1,
    1,3,4,6,9,11,-1,-1,-1,-1,-1,-1,
    0,1,4,6,8,9,11,-1,-1,-1,-1,-1,
    0,3,4,6,11,-1,-1,-1,-1,-1,-1,-1,
    4,6,8,11,-1,-1,-1,-1,-1,-1,-1,-1,
    6,7,8,9,10,-1,-1,-1,-1,-1,-1,-1,
    0,3,6,7,9,10,-1,-1,-1,-1,-1,-1,
    0,1,6,7,8,10,-1,-1,-1,-1,-1,-1,
    1,3,6,7,10,-1,-1,-1,-1,-1,-1,-1,
    1,2,6,7,8,9,-1,-1,-1,-1,-1,-1,
    0,1,2,3,6,7,9,-1,-1,-1,-1,-1,
    0,2,6,7,8,-1,-1,-1,-1,-1,-1,-1,
    2,3,6,7,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,6,7,8,9,10,11,-1,-1,-1,-1,
    0,2,6,7,9,10,11,-1,-1,-1,-1,-1,
    0,1,2,3,6,7,8,10,11,-1,-1,-1,
    1,2,6,7,10,11,-1,-1,-1,-1,-1,-1,
    1,3,6,7,8,9,11,-1,-1,-1,-1,-1,
    0,1,6,7,9,11,-1,-1,-1,-1,-1,-1,
    0,3,6,7,8,11,-1,-1,-1,-1,-1,-1,
    6,7,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    6,7,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,6,7,8,11,-1,-1,-1,-1,-1,-1,
    0,1,6,7,9,11,-1,-1,-1,-1,-1,-1,
    1,3,6,7,8,9,11,-1,-1,-1,-1,-1,
    1,2,6,7,10,11,-1,-1,-1,-1,-1,-1,
    0,1,2,3,6,7,8,10,11,-1,-1,-1,
    0,2,6,7,9,10,11,-1,-1,-1,-1,-1,
    2,3,6,7,8,9,10,11,-1,-1,-1,-1,
    2,3,6,7,-1,-1,-1,-1,-1,-1,-1,-1,
    0,2,6,7,8,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,6,7,9,-1,-1,-1,-1,-1,
    1,2,6,7,8,9,-1,-1,-1,-1,-1,-1,
    1,3,6,7,10,-1,-1,-1,-1,-1,-1,-1,
    0,1,6,7,8,10,-1,-1,-1,-1,-1,-1,
    0,3,6,7,9,10,-1,-1,-1,-1,-1,-1,
    6,7,8,9,10,-1,-1,-1,-1,-1,-1,-1,
    4,6,8,11,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,4,6,11,-1,-1,-1,-1,-1,-1,-1,
    0,1,4,6,8,9,11,-1,-1,-1,-1,-1,
    1,3,4,6,9,11,-1,-1,-1,-1,-1,-1,
    1,2,4,6,8,10,11,-1,-1,-1,-1,-1,
    0,1,2,3,4,6,10,11,-1,-1,-1,-1,
    0,2,4,6,8,9,10,11,-1,-1,-1,-1,
    2,3,4,6,9,10,11,-1,-1,-1,-1,-1,
    2,3,4,6,8,-1,-1,-1,-1,-1,-1,-1,
    0,2,4,6,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,4,6,8,9,-1,-1,-1,-1,
    1,2,4,6,9,-1,-1,-1,-1,-1,-1,-1,
    1,3,4,6,8,10,-1,-1,-1,-1,-1,-1,
    0,1,4,6,10,-1,-1,-1,-1,-1,-1,-1,
    0,3,4,6,8,9,10,-1,-1,-1,-1,-1,
    4,6,9,10,-1,-1,-1,-1,-1,-1,-1,-1,
    4,5,6,7,9,11,-1,-1,-1,-1,-1,-1,
    0,3,4,5,6,7,8,9,11,-1,-1,-1,
    0,1,4,5,6,7,11,-1,-1,-1,-1,-1,
    1,3,4,5,6,7,8,11,-1,-1,-1,-1,
    1,2,4,5,6,7,9,10,11,-1,-1,-1,
    0,1,2,3,4,5,6,7,8,9,10,11,
    0,2,4,5,6,7,10,11,-1,-1,-1,-1,
    2,3,4,5,6,7,8,10,11,-1,-1,-1,
    2,3,4,5,6,7,9,-1,-1,-1,-1,-1,
    0,2,4,5,6,7,8,9,-1,-1,-1,-1,
    0,1,2,3,4,5,6,7,-1,-1,-1,-1,
    1,2,4,5,6,7,8,-1,-1,-1,-1,-1,
    1,3,4,5,6,7,9,10,-1,-1,-1,-1,
    0,1,4,5,6,7,8,9,10,-1,-1,-1,
    0,3,4,5,6,7,10,-1,-1,-1,-1,-1,
    4,5,6,7,8,10,-1,-1,-1,-1,-1,-1,
    5,6,8,9,11,-1,-1,-1,-1,-1,-1,-1,
    0,3,5,6,9,11,-1,-1,-1,-1,-1,-1,
    0,1,5,6,8,11,-1,-1,-1,-1,-1,-1,
    1,3,5,6,11,-1,-1,-1,-1,-1,-1,-1,
    1,2,5,6,8,9,10,11,-1,-1,-1,-1,
    0,1,2,3,5,6,9,10,11,-1,-1,-1,
    0,2,5,6,8,10,11,-1,-1,-1,-1,-1,
    2,3,5,6,10,11,-1,-1,-1,-1,-1,-1,
    2,3,5,6,8,9,-1,-1,-1,-1,-1,-1,
    0,2,5,6,9,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,5,6,8,-1,-1,-1,-1,-1,
    1,2,5,6,-1,-1,-1,-1,-1,-1,-1,-1,
    1,3,5,6,8,9,10,-1,-1,-1,-1,-1,
    0,1,5,6,9,10,-1,-1,-1,-1,-1,-1,
    0,3,5,6,8,10,-1,-1,-1,-1,-1,-1,
    5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    5,7,10,11,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,5,7,8,10,11,-1,-1,-1,-1,-1,
    0,1,5,7,9,10,11,-1,-1,-1,-1,-1,
    1,3,5,7,8,9,10,11,-1,-1,-1,-1,
    1,2,5,7,11,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,5,7,8,11,-1,-1,-1,-1,
    0,2,5,7,9,11,-1,-1,-1,-1,-1,-1,
    2,3,5,7,8,9,11,-1,-1,-1,-1,-1,
    2,3,5,7,10,-1,-1,-1,-1,-1,-1,-1,
    0,2,5,7,8,10,-1,-1,-1,-1,-1,-1,
    0,1,2,3,5,7,9,10,-1,-1,-1,-1,
    1,2,5,7,8,9,10,-1,-1,-1,-1,-1,
    1,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,5,7,8,-1,-1,-1,-1,-1,-1,-1,
    0,3,5,7,9,-1,-1,-1,-1,-1,-1,-1,
    5,7,8,9,-1,-1,-1,-1,-1,-1,-1,-1,
    4,5,8,10,11,-1,-1,-1,-1,-1,-1,-1,
    0,3,4,5,10,11,-1,-1,-1,-1,-1,-1,
    0,1,4,5,8,9,10,11,-1,-1,-1,-1,
    1,3,4,5,9,10,11,-1,-1,-1,-1,-1,
    1,2,4,5,8,11,-1,-1,-1,-1,-1,-1,
    0,1,2,3,4,5,11,-1,-1,-1,-1,-1,
    0,2,4,5,8,9,11,-1,-1,-1,-1,-1,
    2,3,4,5,9,11,-1,-1,-1,-1,-1,-1,
    2,3,4,5,8,10,-1,-1,-1,-1,-1,-1,
    0,2,4,5,10,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,4,5,8,9,10,-1,-1,-1,
    1,2,4,5,9,10,-1,-1,-1,-1,-1,-1,
    1,3,4,5,8,-1,-1,-1,-1,-1,-1,-1,
    0,1,4,5,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,4,5,8,9,-1,-1,-1,-1,-1,-1,
    4,5,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,7,9,10,11,-1,-1,-1,-1,-1,-1,-1,
    0,3,4,7,8,9,10,11,-1,-1,-1,-1,
    0,1,4,7,10,11,-1,-1,-1,-1,-1,-1,
    1,3,4,7,8,10,11,-1,-1,-1,-1,-1,
    1,2,4,7,9,11,-1,-1,-1,-1,-1,-1,
    0,1,2,3,4,7,8,9,11,-1,-1,-1,
    0,2,4,7,11,-1,-1,-1,-1,-1,-1,-1,
    2,3,4,7,8,11,-1,-1,-1,-1,-1,-1,
    2,3,4,7,9,10,-1,-1,-1,-1,-1,-1,
    0,2,4,7,8,9,10,-1,-1,-1,-1,-1,
    0,1,2,3,4,7,10,-1,-1,-1,-1,-1,
    1,2,4,7,8,10,-1,-1,-1,-1,-1,-1,
    1,3,4,7,9,-1,-1,-1,-1,-1,-1,-1,
    0,1,4,7,8,9,-1,-1,-1,-1,-1,-1,
    0,3,4,7,-1,-1,-1,-1,-1,-1,-1,-1,
    4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    8,9,10,11,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,9,10,11,-1,-1,-1,-1,-1,-1,-1,
    0,1,8,10,11,-1,-1,-1,-1,-1,-1,-1,
    1,3,10,11,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,8,9,11,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,9,11,-1,-1,-1,-1,-1,-1,
    0,2,8,11,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,8,9,10,-1,-1,-1,-1,-1,-1,-1,
    0,2,9,10,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,8,10,-1,-1,-1,-1,-1,-1,
    1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,3,8,9,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1
];

// converts from an edge number to the numbers of the vertices it connects
const edgeToVertsTable = [
    0, 1, // 0
    1, 2, // 1
    2, 3, // 2
    0, 3, // 3
    4, 5, // 4
    5, 6, // 5
    6, 7, // 6
    4, 7, // 7
    0, 4, // 8
    1, 5, // 9
    2, 6, // 10
    3, 7, // 11
    
];

// triangulation table created from: https://github.com/KineticTactic/marching-cubes-js
const triTable = [
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,2,1,3,2,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,4,3,1,2,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,1,3,0,1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,2,1,0,4,2,4,3,2,-1,-1,-1,-1,-1,-1,
    1,2,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,1,2,3,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,4,0,2,3,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,4,1,0,3,4,3,2,4,-1,-1,-1,-1,-1,-1,
    1,2,0,3,2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,1,0,2,3,2,4,3,-1,-1,-1,-1,-1,-1,
    1,2,0,1,4,2,4,3,2,-1,-1,-1,-1,-1,-1,
    1,0,2,2,0,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,1,0,3,1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,5,4,2,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,0,4,2,3,0,3,1,0,-1,-1,-1,-1,-1,-1,
    0,1,5,4,2,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,4,5,3,0,4,1,2,6,-1,-1,-1,-1,-1,-1,
    5,1,6,5,0,1,4,2,3,-1,-1,-1,-1,-1,-1,
    0,5,4,0,4,3,0,3,1,3,4,2,-1,-1,-1,
    4,2,3,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,2,3,4,1,2,1,0,2,-1,-1,-1,-1,-1,-1,
    7,0,1,6,4,5,2,3,8,-1,-1,-1,-1,-1,-1,
    2,3,5,4,2,5,4,5,1,4,1,0,-1,-1,-1,
    1,5,0,1,6,5,3,4,2,-1,-1,-1,-1,-1,-1,
    1,5,4,1,2,5,1,0,2,3,5,2,-1,-1,-1,
    2,3,4,5,0,7,5,7,6,7,0,1,-1,-1,-1,
    0,1,4,0,4,2,2,4,3,-1,-1,-1,-1,-1,-1,
    2,1,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    5,3,2,0,4,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,2,1,3,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,3,2,4,1,3,1,0,3,-1,-1,-1,-1,-1,-1,
    0,1,5,4,3,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,0,6,1,2,8,4,7,5,-1,-1,-1,-1,-1,-1,
    3,1,4,3,2,1,2,0,1,-1,-1,-1,-1,-1,-1,
    0,5,3,1,0,3,1,3,2,1,2,4,-1,-1,-1,
    4,3,2,0,1,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,6,1,0,4,6,2,5,3,-1,-1,-1,-1,-1,-1,
    0,5,4,0,1,5,2,3,6,-1,-1,-1,-1,-1,-1,
    1,0,3,1,3,4,1,4,5,2,4,3,-1,-1,-1,
    5,1,6,5,0,1,4,3,2,-1,-1,-1,-1,-1,-1,
    2,5,3,0,4,1,4,6,1,4,7,6,-1,-1,-1,
    3,2,0,3,0,5,3,5,4,5,0,1,-1,-1,-1,
    1,0,2,1,2,3,3,2,4,-1,-1,-1,-1,-1,-1,
    3,1,2,0,1,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,1,0,4,2,1,2,3,1,-1,-1,-1,-1,-1,-1,
    0,3,4,0,1,3,1,2,3,-1,-1,-1,-1,-1,-1,
    0,2,1,1,2,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    5,3,4,5,2,3,6,0,1,-1,-1,-1,-1,-1,-1,
    7,1,2,6,4,0,4,3,0,4,5,3,-1,-1,-1,
    4,0,1,4,1,2,4,2,3,5,2,1,-1,-1,-1,
    0,4,2,0,2,1,1,2,3,-1,-1,-1,-1,-1,-1,
    3,5,2,3,4,5,1,6,0,-1,-1,-1,-1,-1,-1,
    4,2,3,4,3,1,4,1,0,1,3,5,-1,-1,-1,
    2,3,7,0,1,6,1,5,6,1,4,5,-1,-1,-1,
    4,1,0,4,0,3,3,0,2,-1,-1,-1,-1,-1,-1,
    5,2,4,4,2,3,6,0,1,6,1,7,-1,-1,-1,
    2,3,0,2,0,4,3,6,0,1,0,5,6,5,0,
    6,5,0,6,0,1,5,2,0,4,0,3,2,3,0,
    3,2,0,1,3,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,1,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,4,1,2,5,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,0,1,2,5,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,4,1,0,5,4,2,6,3,-1,-1,-1,-1,-1,-1,
    0,3,2,1,3,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,5,4,1,2,5,3,0,6,-1,-1,-1,-1,-1,-1,
    4,3,2,4,0,3,0,1,3,-1,-1,-1,-1,-1,-1,
    2,5,4,2,4,0,2,0,3,1,0,4,-1,-1,-1,
    0,1,5,4,3,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    6,0,4,6,1,0,5,3,2,-1,-1,-1,-1,-1,-1,
    0,1,6,2,3,8,4,7,5,-1,-1,-1,-1,-1,-1,
    2,6,3,0,5,1,5,7,1,5,4,7,-1,-1,-1,
    3,1,4,3,2,1,2,0,1,-1,-1,-1,-1,-1,-1,
    0,4,5,0,5,2,0,2,1,2,5,3,-1,-1,-1,
    1,5,3,0,1,3,0,3,2,0,2,4,-1,-1,-1,
    1,0,3,1,3,4,4,3,2,-1,-1,-1,-1,-1,-1,
    1,5,2,0,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,1,0,2,5,1,4,3,6,-1,-1,-1,-1,-1,-1,
    1,7,0,3,8,4,6,2,5,-1,-1,-1,-1,-1,-1,
    7,4,3,0,6,5,0,5,1,5,6,2,-1,-1,-1,
    4,0,1,4,3,0,2,5,6,-1,-1,-1,-1,-1,-1,
    1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,
    6,2,5,7,0,3,0,4,3,0,1,4,-1,-1,-1,
    5,1,6,5,6,2,1,0,6,3,6,4,0,4,6,
    1,8,0,5,6,2,7,4,3,-1,-1,-1,-1,-1,-1,
    3,6,4,2,5,1,2,1,0,1,5,7,-1,-1,-1,
    0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,
    6,1,0,6,8,1,6,2,8,5,8,2,3,7,4,
    6,2,5,1,7,3,1,3,0,3,7,4,-1,-1,-1,
    3,1,6,3,6,4,1,0,6,5,6,2,0,2,6,
    0,3,7,0,4,3,0,1,4,8,4,1,6,2,5,
    2,1,4,2,4,5,0,3,4,3,5,4,-1,-1,-1,
    3,0,2,1,0,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,6,3,2,5,6,0,4,1,-1,-1,-1,-1,-1,-1,
    4,0,1,4,3,0,3,2,0,-1,-1,-1,-1,-1,-1,
    4,1,0,4,0,3,4,3,2,3,0,5,-1,-1,-1,
    0,2,4,0,1,2,1,3,2,-1,-1,-1,-1,-1,-1,
    3,0,6,1,2,7,2,4,7,2,5,4,-1,-1,-1,
    0,1,2,2,1,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,1,0,4,0,2,2,0,3,-1,-1,-1,-1,-1,-1,
    5,2,4,5,3,2,6,0,1,-1,-1,-1,-1,-1,-1,
    0,4,1,1,4,7,2,5,6,2,6,3,-1,-1,-1,
    3,7,2,0,1,5,0,5,4,5,1,6,-1,-1,-1,
    3,2,0,3,0,5,2,4,0,1,0,6,4,6,0,
    4,3,2,4,1,3,4,0,1,5,3,1,-1,-1,-1,
    4,6,1,4,1,0,6,3,1,5,1,2,3,2,1,
    1,4,3,1,3,0,0,3,2,-1,-1,-1,-1,-1,-1,
    1,0,2,3,1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,4,0,1,2,4,2,3,4,-1,-1,-1,-1,-1,-1,
    0,3,1,0,5,3,0,4,5,2,3,5,-1,-1,-1,
    5,2,3,1,5,3,1,3,4,1,4,0,-1,-1,-1,
    4,2,3,4,3,0,0,3,1,-1,-1,-1,-1,-1,-1,
    0,1,2,0,2,4,0,4,5,4,2,3,-1,-1,-1,
    2,4,6,2,6,1,4,5,6,0,6,3,5,3,6,
    3,4,0,3,0,2,2,0,1,-1,-1,-1,-1,-1,-1,
    3,1,0,2,3,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,7,6,2,4,6,4,5,4,2,3,-1,-1,-1,
    1,0,3,1,3,6,0,4,3,2,3,5,4,5,3,
    1,6,0,1,5,6,1,7,5,4,5,7,2,3,8,
    5,1,0,5,0,3,4,2,0,2,3,0,-1,-1,-1,
    4,5,2,4,2,3,5,0,2,6,2,1,0,1,2,
    0,4,1,5,2,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,4,0,3,0,2,1,5,0,5,2,0,-1,-1,-1,
    1,2,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,0,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,0,4,5,3,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,4,5,3,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,0,5,4,1,0,6,3,2,-1,-1,-1,-1,-1,-1,
    4,0,1,2,5,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,7,3,0,6,4,8,5,-1,-1,-1,-1,-1,-1,
    1,4,0,1,5,4,2,6,3,-1,-1,-1,-1,-1,-1,
    2,7,3,0,6,1,6,4,1,6,5,4,-1,-1,-1,
    3,0,1,2,0,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,0,4,3,2,0,2,1,0,-1,-1,-1,-1,-1,-1,
    2,5,4,2,3,5,0,1,6,-1,-1,-1,-1,-1,-1,
    0,2,1,0,4,2,0,5,4,4,3,2,-1,-1,-1,
    4,3,2,4,0,3,0,1,3,-1,-1,-1,-1,-1,-1,
    5,3,2,1,3,5,1,4,3,1,0,4,-1,-1,-1,
    0,1,3,0,3,5,0,5,4,2,5,3,-1,-1,-1,
    1,0,4,1,4,2,2,4,3,-1,-1,-1,-1,-1,-1,
    1,2,0,3,2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,3,4,1,0,3,0,2,3,-1,-1,-1,-1,-1,-1,
    4,3,6,4,2,3,5,0,1,-1,-1,-1,-1,-1,-1,
    4,2,3,4,3,1,4,1,0,5,1,3,-1,-1,-1,
    3,4,2,3,6,4,1,5,0,-1,-1,-1,-1,-1,-1,
    1,2,6,3,0,7,0,5,7,0,4,5,-1,-1,-1,
    2,7,4,2,3,7,0,1,5,1,6,5,-1,-1,-1,
    5,4,1,5,1,0,4,2,1,6,1,3,2,3,1,
    4,0,1,4,2,0,2,3,0,-1,-1,-1,-1,-1,-1,
    0,2,1,2,3,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,7,0,2,3,4,2,4,5,4,3,6,-1,-1,-1,
    0,4,2,0,2,1,1,2,3,-1,-1,-1,-1,-1,-1,
    4,0,1,4,3,0,4,2,3,3,5,0,-1,-1,-1,
    4,1,0,4,0,3,3,0,2,-1,-1,-1,-1,-1,-1,
    2,3,1,2,1,4,3,6,1,0,1,5,6,5,1,
    3,2,0,1,3,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,4,1,3,2,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,6,1,2,7,3,8,5,4,-1,-1,-1,-1,-1,-1,
    3,0,1,3,2,0,5,4,6,-1,-1,-1,-1,-1,-1,
    7,5,4,6,1,2,1,3,2,1,0,3,-1,-1,-1,
    6,3,2,7,0,1,5,4,8,-1,-1,-1,-1,-1,-1,
    6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,
    5,4,7,3,2,6,2,1,6,2,0,1,-1,-1,-1,
    1,2,6,1,3,2,1,0,3,7,3,0,8,5,4,
    5,0,1,5,4,0,3,2,6,-1,-1,-1,-1,-1,-1,
    7,3,2,0,6,4,0,4,1,4,6,5,-1,-1,-1,
    3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,
    4,1,6,4,6,5,1,0,6,2,6,3,0,3,6,
    6,3,2,7,0,4,0,5,4,0,1,5,-1,-1,-1,
    1,4,8,1,5,4,1,0,5,6,5,0,7,3,2,
    2,0,6,2,6,3,0,1,6,4,6,5,1,5,6,
    3,2,5,3,5,4,1,0,5,0,4,5,-1,-1,-1,
    1,3,0,1,4,3,4,2,3,-1,-1,-1,-1,-1,-1,
    1,3,5,0,3,1,0,2,3,0,4,2,-1,-1,-1,
    0,5,4,0,2,5,0,1,2,2,3,5,-1,-1,-1,
    3,4,1,3,1,2,2,1,0,-1,-1,-1,-1,-1,-1,
    0,1,6,5,2,7,5,7,4,7,2,3,-1,-1,-1,
    0,8,3,0,5,8,0,6,5,4,5,6,1,2,7,
    6,4,2,6,2,3,4,0,2,5,2,1,0,1,2,
    3,5,1,3,1,2,0,4,1,4,2,1,-1,-1,-1,
    2,4,5,2,0,4,2,3,0,1,4,0,-1,-1,-1,
    4,2,3,4,3,0,0,3,1,-1,-1,-1,-1,-1,-1,
    1,4,6,1,6,0,4,5,6,3,6,2,5,2,6,
    0,2,3,1,0,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,3,0,3,6,1,4,3,2,3,5,4,5,3,
    5,1,0,5,0,3,4,2,0,2,3,0,-1,-1,-1,
    0,1,4,2,3,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,0,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,0,2,1,0,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    6,2,5,6,3,2,4,1,0,-1,-1,-1,-1,-1,-1,
    2,6,3,2,5,6,1,4,0,-1,-1,-1,-1,-1,-1,
    6,3,2,6,7,3,5,4,0,4,1,0,-1,-1,-1,
    4,0,1,4,3,0,3,2,0,-1,-1,-1,-1,-1,-1,
    0,6,3,1,2,5,1,5,4,5,2,7,-1,-1,-1,
    4,3,2,4,1,3,4,0,1,1,5,3,-1,-1,-1,
    3,2,0,3,0,6,2,5,0,1,0,4,5,4,0,
    0,2,4,0,1,2,1,3,2,-1,-1,-1,-1,-1,-1,
    4,1,0,4,2,1,4,3,2,5,1,2,-1,-1,-1,
    6,0,1,4,7,3,4,3,5,3,7,2,-1,-1,-1,
    5,4,1,5,1,0,4,3,1,6,1,2,3,2,1,
    0,1,2,1,3,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,4,3,0,3,1,1,3,2,-1,-1,-1,-1,-1,-1,
    4,0,1,4,1,2,2,1,3,-1,-1,-1,-1,-1,-1,
    3,2,1,0,3,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,0,1,3,2,3,4,2,-1,-1,-1,-1,-1,-1,
    3,0,2,3,5,0,3,4,5,5,1,0,-1,-1,-1,
    0,1,5,4,2,6,4,6,7,6,2,3,-1,-1,-1,
    5,6,2,5,2,3,6,1,2,4,2,0,1,0,2,
    1,3,0,1,4,3,1,5,4,2,3,4,-1,-1,-1,
    0,4,6,0,6,3,4,5,6,2,6,1,5,1,6,
    0,1,3,0,3,5,1,6,3,2,3,4,6,4,3,
    4,2,3,0,5,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,5,1,3,0,1,2,3,1,4,2,-1,-1,-1,
    3,4,1,3,1,2,2,1,0,-1,-1,-1,-1,-1,-1,
    3,8,2,3,5,8,3,6,5,4,5,6,0,1,7,
    3,5,1,3,1,2,0,4,1,4,2,1,-1,-1,-1,
    4,2,3,4,3,1,1,3,0,-1,-1,-1,-1,-1,-1,
    0,2,3,1,0,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,2,3,4,3,1,5,0,3,0,1,3,-1,-1,-1,
    2,0,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,4,1,0,2,4,2,3,4,-1,-1,-1,-1,-1,-1,
    0,4,1,2,5,3,5,7,3,5,6,7,-1,-1,-1,
    1,4,5,1,5,2,1,2,0,3,2,5,-1,-1,-1,
    1,0,2,1,2,4,0,5,2,3,2,6,5,6,2,
    2,5,3,4,5,2,4,1,5,4,0,1,-1,-1,-1,
    7,5,4,7,8,5,7,1,8,2,8,1,0,6,3,
    4,3,2,4,2,1,1,2,0,-1,-1,-1,-1,-1,-1,
    5,3,2,5,2,0,4,1,2,1,0,2,-1,-1,-1,
    0,4,5,0,3,4,0,1,3,3,2,4,-1,-1,-1,
    5,6,3,5,3,2,6,1,3,4,3,0,1,0,3,
    3,5,6,3,6,2,5,4,6,1,6,0,4,0,6,
    0,5,1,4,3,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,4,0,2,0,3,3,0,1,-1,-1,-1,-1,-1,-1,
    2,5,1,2,1,3,0,4,1,4,3,1,-1,-1,-1,
    2,0,1,3,2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,0,2,3,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,0,2,1,2,4,4,2,3,-1,-1,-1,-1,-1,-1,
    0,1,3,0,3,2,2,3,4,-1,-1,-1,-1,-1,-1,
    1,0,2,3,1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,4,0,4,3,3,4,2,-1,-1,-1,-1,-1,-1,
    3,0,4,3,4,5,1,2,4,2,5,4,-1,-1,-1,
    0,1,3,2,0,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,0,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,0,2,4,4,2,3,-1,-1,-1,-1,-1,-1,
    2,3,1,0,2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,4,2,4,5,0,1,4,1,5,4,-1,-1,-1,
    0,2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,3,0,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,2,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1
];

const tablesLength = vertCoordTable.length + edgeTable.length + edgeToVertsTable.length + triTable.length;

// shader programs ################################################################################################
const shaderCode = `
    [[block]]
    struct Uniform {
        pMat : mat4x4<f32>;
        mvMat : mat4x4<f32>;
    };

    struct VertexOut {
        [[builtin(position)]] position : vec4<f32>;
        [[location(0)]] normal : vec3<f32>;
        [[location(1)]] eye : vec3<f32>;
    };

    struct Light {
        dir : vec3<f32>;
        color : vec3<f32>;
    };

    [[group(0), binding(0)]] var<uniform> u : Uniform;

    
    [[stage(vertex)]]
    fn vertex_main([[location(0)]] position: vec3<f32>,
                    [[location(1)]] normal: vec3<f32>) -> VertexOut
    {
        var out : VertexOut;
        var vert : vec4<f32> = u.mvMat * vec4<f32>(position, 1.0);
        
        out.position = u.pMat * vert;
        out.normal = normal;
        out.eye = -vec3<f32>(vert.xyz);

        return out;
    }

    [[stage(fragment)]]
    fn fragment_main([[builtin(front_facing)]] frontFacing : bool, data: VertexOut) -> [[location(0)]] vec4<f32>
    {
        
        var light1 : Light;
        light1.dir = vec3<f32>(0.0, 0.0, -1.0);
        light1.color = vec3<f32>(1.0);

        var diffuseColor = vec3<f32>(0.1, 0.7, 0.6);
        let specularColor = vec3<f32>(1.0);
        let shininess : f32 = 150.0;

        var E = normalize(data.eye);
        var N = normalize(data.normal);

        if (frontFacing) {
            diffuseColor = vec3<f32>(0.7, 0.2, 0.2);
            N = -N;
        }
        
        var diffuseFac = max(dot(-N, light1.dir), 0.0);
        
        var diffuse : vec3<f32>;
        var specular : vec3<f32>;
        var ambient : vec3<f32> = diffuseColor*0.3;
        
        var reflected : vec3<f32>;

        if (diffuseFac > 0.0) {
            diffuse = diffuseColor*light1.color*diffuseFac;

            reflected = reflect(light1.dir, N);
            var specularFac : f32 = pow(max(dot(reflected, E), 0.0), shininess);
            specular = specularColor*light1.color*specularFac;
        }
        
        return vec4<f32>(diffuse + specular + ambient, 1.0);
        //return vec4<f32>(N, 1.0);
    }          
`

const enumerateCode = `
[[block]] struct Data {
    [[size(16)]] size :  vec3<u32>;
    [[size(16)]] WGNum :  vec3<u32>;
    data :  array<u32>;
};
[[block]] struct Arr {
    data : array<i32>;
};
[[block]] struct Vars {
    threshold : f32;
    vertCount : atomic<u32>;
    indexCount : atomic<u32>;
};
[[block]] struct Tables {
    vertCoord : array<array<u32, 3>, 8>;
    edge : array<array<i32, 12>, 256>;
    edgeToVerts : array<array<i32, 2>, 12>;
    tri : array<array<i32, 15>, 256>;
};
[[block]] struct U32Buffer {
    buffer : array<u32>;
};
[[block]] struct TotalsBuffer {
    val : atomic<u32>;
    buffer : array<u32>;
};

[[group(0), binding(0)]] var<storage, read> d : Data;
[[group(0), binding(1)]] var<storage, read> tables : Tables;

[[group(1), binding(0)]] var<storage, read_write> vars : Vars;

[[group(2), binding(0)]] var<storage, read_write> WGVertOffsets : U32Buffer;
[[group(2), binding(1)]] var<storage, read_write> WGVertOffsetsTotals : TotalsBuffer;

[[group(3), binding(0)]] var<storage, read_write> WGIndexOffsets : U32Buffer;
[[group(3), binding(1)]] var<storage, read_write> WGIndexOffsetsTotals : TotalsBuffer;

var<workgroup> localVertOffsets : array<u32, ${WGSize.x*WGSize.y*WGSize.z}>;
var<workgroup> localIndexOffsets : array<u32, ${WGSize.x*WGSize.y*WGSize.z}>;



fn getIndex3d(x : u32, y : u32, z : u32, size : vec3<u32>) -> u32 {
    return size.y * size.z * x + size.z * y + z;
}

fn getVertCount(code : u32) -> u32 {
    var i = 0u;
    loop {
        if (i == 12u || tables.edge[code][i] == -1) {
            break;
        }
        i = i + 1u;
    }
    return i;
}
fn getIndexCount(code : u32) -> u32 {
    var i = 0u;
    loop {
        if (i == 15u || tables.tri[code][i] == -1) {
            break;
        }
        i = i + 1u;
    }
    return i;
}

fn unpack(val: u32, i : u32, packing : u32) -> f32{
    if (packing == 4u){
        return unpack4x8unorm(val)[i];
    }
    return bitcast<f32>(val);
}

fn getVal(x : u32, y : u32, z : u32, packing : u32) -> f32 {
    var a = getIndex3d(x, y, z, d.size);
    return unpack(d.data[a/packing], a%packing, packing);
}

[[stage(compute), workgroup_size(${WGSize.x}, ${WGSize.y}, ${WGSize.z})]]
fn main(
    [[builtin(global_invocation_id)]] id : vec3<u32>, 
    [[builtin(local_invocation_index)]] localIndex : u32,
    [[builtin(workgroup_id)]] WGId : vec3<u32>
) {                
    var packing = ${packing}u;
    var code = 0u;
    var thisVertCount = 0u;
    var thisIndexCount = 0u;
    var WGSize = ${WGSize.x*WGSize.y*WGSize.z}u;

    // if outside of data, return
    var cells : vec3<u32> = vec3<u32>(d.size.x - 1u, d.size.y - 1u, d.size.z - 1u);      
    if (id.x < cells.x && id.y < cells.y && id.z < cells.z) {        
        var c : array<u32, 3>;
        var i = 0u;
        loop {
            if (i == 8u) {
                break;
            }
            // the coordinate of the vert being looked at
            c = tables.vertCoord[i];
            var val = getVal(id.x + c[0], id.y + c[1], id.z + c[2], packing);
            if (val > vars.threshold) {
                code = code | (1u << i);
            }
            continuing {
                i = i + 1u;
            }
        }
        thisVertCount = getVertCount(code);
        thisIndexCount = getIndexCount(code);

    }

    localVertOffsets[localIndex] = thisVertCount;
    localIndexOffsets[localIndex] = thisIndexCount;

    var halfl = WGSize >> 1u;
    var r = halfl;
    var offset = 1u;
    var left = 0u;
    var right = 0u;

    loop {
        if (r == 0u) {
            break;
        }
        workgroupBarrier();
        if (localIndex < halfl) {
            // if in the first half, sort the vert counts
            if (localIndex < r) {
                left = offset * (2u * localIndex + 1u) - 1u;
                right = offset * (2u * localIndex + 2u) - 1u;
                localVertOffsets[right] = localVertOffsets[left] + localVertOffsets[right];
            }
        } else {
            if (localIndex - halfl < r) {
                left = offset * (2u * (localIndex - halfl) + 1u) - 1u;
                right = offset * (2u * (localIndex - halfl) + 2u) - 1u;
                localIndexOffsets[right] = localIndexOffsets[left] + localIndexOffsets[right];
            }
        }
        
        continuing {
            r = r >> 1u;
            offset = offset << 1u;
        }
    }
    if (localIndex == 0u) {
        WGVertOffsets.buffer[getIndex3d(WGId.x, WGId.y, WGId.z, d.WGNum)] = localVertOffsets[WGSize - 1u];
        //ignore(atomicAdd(&vars.vertCount, localVertOffsets[WGSize - 1u]));
    }
    if (localIndex == 1u) {
        WGIndexOffsets.buffer[getIndex3d(WGId.x, WGId.y, WGId.z, d.WGNum)] = localIndexOffsets[WGSize - 1u];
        //ignore(atomicAdd(&vars.indexCount, localIndexOffsets[WGSize - 1u]));
    }
}
`;

// general prefix sum applied to the buffer in group(0) binding(0)
const prefixSumA = `
    [[block]] struct U32Buffer {
        buffer : array<u32>;
    };
    [[block]] struct TotalsBuffer {
        val : u32;
        buffer : array<u32>;
    };

    [[group(0), binding(0)]] var<storage, read_write> buffer : U32Buffer;
    [[group(0), binding(1)]] var<storage, read_write> totals : TotalsBuffer;

    var<workgroup> blockOffset : u32;

    [[stage(compute), workgroup_size(${WGPrefixSumCount})]]
    fn main(
        [[builtin(global_invocation_id)]] gid : vec3<u32>, 
        [[builtin(local_invocation_id)]] lid : vec3<u32>,
        [[builtin(workgroup_id)]] wid : vec3<u32>
    ) {
        // algorithm:
        // 1. each WG performs prefix sum on their own block of the buffer (512 elements)
        //  a. sweep up the data
        //  b. extract the total value
        //  c. sweep down to complete for that block
        // 2. whole buffer is scanned
        //  a. block totals are transferred to totalsBuffer
        //  b. block totals are scanned by WG 0
        //   i. sweep up totals buffer
        //   ii. extract the total sum from last position (store)
        //   iii. sweep down to finish
        //  c. add scanned block total i to elements of block i by its WG 
        
        var blockLength = ${2*WGPrefixSumCount}u;
        var numBlocks = arrayLength(&buffer.buffer)/blockLength;
        
        if(lid.x == 0u) {
            blockOffset = wid.x * blockLength;
        }
        
        

        var d = blockLength >> 1u;
        var offset = 1u;
        var left = 0u;
        var right = 0u;

        loop {
            if (d == 0u) {
                break;
            }
            workgroupBarrier();
            storageBarrier();
            if (lid.x < d) {
                left = offset * (2u * lid.x + 1u) - 1u + blockOffset;
                right = offset * (2u * lid.x + 2u) - 1u + blockOffset;
                buffer.buffer[right] = buffer.buffer[left] + buffer.buffer[right];
            }
            continuing {
                d = d >> 1u;
                offset = offset << 1u;
            }
        }
        if (lid.x == 0u) {
            if (numBlocks == 1u) {
                totals.val = buffer.buffer[blockLength - 1u];
            } else {
                totals.buffer[wid.x] = buffer.buffer[blockLength - 1u + blockOffset];
            }
            buffer.buffer[blockLength - 1u + blockOffset] = 0u;
        }

        d = 1u;
        var t : u32;
        loop {
            if (d == blockLength) {
                break;
            }
            offset = offset >> 1u;
            workgroupBarrier();
            storageBarrier();

            if (lid.x < d) {
                left = offset * (2u * lid.x + 1u) - 1u + blockOffset;
                right = offset * (2u * lid.x + 2u) - 1u + blockOffset;
                t = buffer.buffer[left];
                buffer.buffer[left] = buffer.buffer[right];
                buffer.buffer[right] = buffer.buffer[right] + t;
            }
            
            continuing {
                d = 2u * d;
            }
        }
    }

`
const prefixSumB = `
    [[block]] struct U32Buffer {
        buffer : array<u32>;
    };
    [[block]] struct TotalsBuffer {
        val : u32;
        buffer : array<u32>;
    };

    [[group(0), binding(0)]] var<storage, read_write> buffer : U32Buffer;
    [[group(0), binding(1)]] var<storage, read_write> totals : TotalsBuffer;

    var<workgroup> blockOffset : u32;

    // credit to : https://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
    fn nextPowerOf2(a : u32) -> u32 {
        var v : u32 = a;
        v = v - 1u;
        v = v | v >> 1u;
        v = v | v >> 2u;
        v = v | v >> 4u;
        v = v | v >> 8u;
        v = v | v >> 16u;
        v = v + 1u;
        return v;
    }

    [[stage(compute), workgroup_size(${WGPrefixSumCount})]]
    fn main(
        [[builtin(global_invocation_id)]] gid : vec3<u32>, 
        [[builtin(local_invocation_id)]] lid : vec3<u32>,
        [[builtin(workgroup_id)]] wid : vec3<u32>
    ) {                    
        if(lid.x == 0u) {
            blockOffset = 2u*gid.x;
        }
        
        var blockLength = ${2*WGPrefixSumCount}u;
        var numBlocks = arrayLength(&buffer.buffer)/blockLength;
        
        // only need to consider this section
        var length : u32 = max(512u, nextPowerOf2(numBlocks));
        
        var d = length >> 1u;
        var offset = 1u;
        var left = 0u;
        var right = 0u;

        // scan the block totals (only 1 WG)

        loop {
            if (d == 0u) {
                break;
            }
            workgroupBarrier();
            storageBarrier();
            if (gid.x < d) {
                left = offset * (2u * gid.x + 1u) - 1u;
                right = offset * (2u * gid.x + 2u) - 1u;
                totals.buffer[right] = totals.buffer[left] + totals.buffer[right];
            }
            continuing {
                d = d >> 1u;
                offset = offset << 1u;
            }
        }
        if (gid.x == 0u) {
            totals.val = totals.buffer[length - 1u];
            totals.buffer[length - 1u] = 0u;
        }

        d = 1u;
        var t : u32;
        loop {
            if (d == length) {
                break;
            }
            offset = offset >> 1u;
            workgroupBarrier();
            storageBarrier();

            if (gid.x < d) {
                left = offset * (2u * gid.x + 1u) - 1u;
                right = offset * (2u * gid.x + 2u) - 1u;
                t = totals.buffer[left];
                totals.buffer[left] = totals.buffer[right];
                // this line is problematic when numblocks > 64 (i.e. 128)
                totals.buffer[right] = totals.buffer[right] + t;
            }
            
            continuing {
                d = 2u * d;
            }
        }
        if (lid.x < numBlocks) {
            var i = 0u;
            loop {
                if (i == blockLength) {
                    break;
                }
                buffer.buffer[i + 2u*lid.x*blockLength] = totals.buffer[2u*lid.x] + buffer.buffer[i + 2u*lid.x*blockLength];
                buffer.buffer[i + (2u*lid.x+1u)*blockLength] = totals.buffer[2u*lid.x + 1u] + buffer.buffer[i + (2u*lid.x+1u)*blockLength];
                continuing {
                    i = i + 1u;
                }
            }
        }                    
    }
`

const marchCodeNew = `
[[block]] struct Data {
    [[size(16)]] size : vec3<u32>;
    [[size(16)]] WGNum : vec3<u32>;
    data : array<u32>;
};
[[block]] struct Vars {
    threshold : f32;
    currVert : atomic<u32>;
    currIndex : atomic<u32>;
};
[[block]] struct Tables {
    vertCoord : array<array<u32, 3>, 8>;
    edge : array<array<i32, 12>, 256>;
    edgeToVerts : array<array<i32, 2>, 12>;
    tri : array<array<i32, 15>, 256>;
};
[[block]] struct F32Buff {
    buffer : array<f32>;
};
[[block]] struct U32Buff {
    buffer : array<u32>;
};
[[block]] struct Atoms {
    vert : atomic<u32>;
    index : atomic<u32>;
};

[[group(0), binding(0)]] var<storage, read> d : Data;
[[group(0), binding(1)]] var<storage, read> tables : Tables;

[[group(1), binding(0)]] var<storage, read_write> vars : Vars;

[[group(2), binding(0)]] var<storage, read_write> verts : F32Buff;
[[group(2), binding(1)]] var<storage, read_write> normals : F32Buff;
[[group(2), binding(2)]] var<storage, read_write> indices : U32Buff;

[[group(3), binding(0)]] var<storage, read_write> WGVertOffsets : U32Buff;
[[group(3), binding(1)]] var<storage, read_write> WGIndexOffsets : U32Buff;

var<workgroup> localVertOffsets : array<u32, ${WGSize.x*WGSize.y*WGSize.z}>;
var<workgroup> localIndexOffsets : array<u32, ${WGSize.x*WGSize.y*WGSize.z}>;
var<workgroup> localVertOffsetsAtom : atomic<u32>;
var<workgroup> localIndexOffsetsAtom : atomic<u32>;

fn getIndex3d(x : u32, y : u32, z : u32, size : vec3<u32>) -> u32 {
    return size.y * size.z * x + size.z * y + z;
}

fn unpack(val: u32, i : u32, packing : u32) -> f32{
    if (packing == 4u){
        return unpack4x8unorm(val)[i];
    }
    return bitcast<f32>(val);
}

fn getVal(x : u32, y : u32, z : u32, packing : u32) -> f32 {
    var a = getIndex3d(x, y, z, d.size);
    return unpack(d.data[a/packing], a%packing, packing);
}


[[stage(compute), workgroup_size(${WGSize.x}, ${WGSize.y}, ${WGSize.z})]]
fn main(
    [[builtin(global_invocation_id)]] id : vec3<u32>,
    [[builtin(local_invocation_index)]] localIndex : u32,
    [[builtin(workgroup_id)]] wgid : vec3<u32>
) {         
    
    var WGSize = ${WGSize.x*WGSize.y*WGSize.z}u;
    
    var packing = ${packing}u;
    var code = 0u;

    var vertNum : u32 = 0u;
    var indexNum : u32 = 0u;

    var gridNormals : array<array<f32, 3>, 8>;

    var thisVerts : array<f32, 36>;
    var thisNormals : array<f32, 36>;
    var thisIndices : array<u32, 15>;

    var globalIndex : u32 = getIndex3d(id.x, id.y, id.z, d.size);

    // if outside of data, return
    var cells : vec3<u32> = vec3<u32>(d.size.x - 1u, d.size.y - 1u, d.size.z - 1u);
    if (id.x >= cells.x || id.y >= cells.y || id.z >= cells.z) {
        // code remains 0
        code = 0u;
    } else {
        // calculate the code   
        var coord : array<u32, 3>;
        var i = 0u;
        loop {
            if (i == 8u) {
                break;
            }
            // the coordinate of the vert being looked at
            coord = tables.vertCoord[i];
            var val : f32 = getVal(id.x + coord[0], id.y + coord[1], id.z + coord[2], packing);
            if (val > vars.threshold) {
                code = code | (1u << i);
            }
            continuing {
                i = i + 1u;
            }
        }
    }

    
    if (code > 0u && code < 255u) {
        // get a code for the active vertices
        var edges : array<i32, 12> = tables.edge[code];
        var activeVerts = 0u;
        var i = 0u;
        loop {
            if (i == 12u || edges[i] == -1){
                break;
            }
            var c : array<i32, 2> = tables.edgeToVerts[edges[i]];
            activeVerts = activeVerts | 1u << u32(c[0]);
            activeVerts = activeVerts | 1u << u32(c[1]);
            continuing {
                i = i + 1u;
            }
        }
        // get grad of grid points
    
        i= 0u;
        loop {
            if (i == 8u) {
                break;
            }
            if ((activeVerts & (1u << i)) == (1u << i)) {
                var a : array<u32, 3> = tables.vertCoord[i];
                var X = id.x + a[0];
                var Y = id.y + a[1];
                var Z = id.z + a[2];
                var thisVal = getVal(id.x + a[0], id.y + a[1], id.z + a[2], packing);

                // x(i) component
                if (X > 0u) {
                    if (X < d.size[0] - 2u){
                        gridNormals[i][0] = -((getVal(X + 1u, Y, Z, packing) - getVal(X - 1u, Y, Z, packing))/2.0);
                    } else {
                        gridNormals[i][0] = -(thisVal - getVal(X - 1u, Y, Z, packing));
                    }
                } else {
                    gridNormals[i][0] = -(getVal(X + 1u, Y, Z, packing) - thisVal);
                }

                // y(Y) component
                if (Y > 0u) {
                    if (Y < d.size[1] - 2u){
                        gridNormals[i][1] = -((getVal(X, Y + 1u, Z, packing) - getVal(X, Y - 1u, Z, packing))/2.0);
                    } else {
                        gridNormals[i][1] = -(thisVal - getVal(X, Y - 1u, Z, packing));
                    }
                } else {
                    gridNormals[i][1] = -(getVal(X, Y + 1u, Z, packing) - thisVal);
                }

                // z(Z) component
                if (Z > 0u) {
                    if (Z < d.size[2] - 2u){
                        gridNormals[i][2] = -((getVal(X, Y, Z + 1u, packing) - getVal(X, Y, Z - 1u, packing))/2.0);
                    } else {
                        gridNormals[i][2] = -(thisVal - getVal(X, Y, Z - 1u, packing));
                    }
                } else {
                    gridNormals[i][2] = -(getVal(X, Y, Z + 1u, packing) - thisVal);
                }
            }
            continuing {
                i = i + 1u;
            }
        }
        // vertices will be produced

        // get vertices
        
        i = 0u;
        loop {
            if (i == 12u || edges[i] == -1) {
                break;
            }
            var c : array<i32, 2> = tables.edgeToVerts[edges[i]];
            var a : array<u32, 3> = tables.vertCoord[c[0]];
            var b : array<u32, 3> = tables.vertCoord[c[1]];
            var va : f32 = getVal(id.x + a[0], id.y + a[1], id.z + a[2], packing);
            var vb : f32 = getVal(id.x + b[0], id.y + b[1], id.z + b[2], packing);
            var fac : f32 = (vars.threshold - va)/(vb - va);
            // fill vertices
            thisVerts[3u*i + 0u] = mix(f32(a[0]), f32(b[0]), fac) + f32(id.x);
            thisVerts[3u*i + 1u] = mix(f32(a[1]), f32(b[1]), fac) + f32(id.y);
            thisVerts[3u*i + 2u] = mix(f32(a[2]), f32(b[2]), fac) + f32(id.z);
            // fill normals
            thisNormals[3u*i + 0u] = mix(gridNormals[c[0]][0], gridNormals[c[1]][0], fac);
            thisNormals[3u*i + 1u] = mix(gridNormals[c[0]][1], gridNormals[c[1]][1], fac);
            thisNormals[3u*i + 2u] = mix(gridNormals[c[0]][2], gridNormals[c[1]][2], fac);

            continuing {
                i = i + 1u;
            }
        }
        vertNum = i;

        // get count of indices
        i = 0u;
        loop {
            if (i == 15u || tables.tri[code][i] == -1) {
                break;
            }
            continuing {
                i = i + 1u;
            }
        }

        indexNum = i;

        localVertOffsets[localIndex] = vertNum;
        localIndexOffsets[localIndex] = indexNum;
    }

    // perform prefix sum of offsets for workgroup
    var halfl = WGSize/2u;
    var r = halfl;
    var offset = 1u;
    var left = 0u;
    var right = 0u;

    loop {
        if (r == 0u) {
            break;
        }
        workgroupBarrier();
        storageBarrier();
        if (localIndex < halfl) {
            // if in the first half, sort the vert counts
            if (localIndex < r) {
                left = offset * (2u * localIndex + 1u) - 1u;
                right = offset * (2u * localIndex + 2u) - 1u;
                localVertOffsets[right] = localVertOffsets[left] + localVertOffsets[right];
            }
        } else {
            if (localIndex - halfl < r) {
                left = offset * (2u * (localIndex - halfl) + 1u) - 1u;
                right = offset * (2u * (localIndex - halfl) + 2u) - 1u;
                localIndexOffsets[right] = localIndexOffsets[left] + localIndexOffsets[right];
            }
        }
        
        continuing {
            r = r >> 1u;
            offset = offset << 1u;
        }
    }

    var last = WGSize - 1u;
    if (localIndex == 0u) {
        localVertOffsets[last] = 0u;
        
    } elseif (localIndex == halfl) {
        localIndexOffsets[last] = 0u;
    }
    
    r = 1u;
    var t : u32;
    loop {
        if (r == WGSize) {
            break;
        }
        offset = offset >> 1u;
        workgroupBarrier();
        storageBarrier();
        if (localIndex < halfl) {
            if (localIndex < r) {
                left = offset * (2u * localIndex + 1u) - 1u;
                right = offset * (2u * localIndex + 2u) - 1u;
                t = localVertOffsets[left];
                localVertOffsets[left] = localVertOffsets[right];
                localVertOffsets[right] = localVertOffsets[right] + t;
            }
        } else {
            if (localIndex - halfl < r) {
                left = offset * (2u * (localIndex - halfl) + 1u) - 1u;
                right = offset * (2u * (localIndex - halfl) + 2u) - 1u;
                t = localIndexOffsets[left];
                localIndexOffsets[left] = localIndexOffsets[right];
                localIndexOffsets[right] = localIndexOffsets[right] + t;
            }
        }
        
        continuing {
            r = 2u * r;
        }
    }

    if (vertNum > 0u && indexNum > 0u) {
        //var vertOffset : u32 = WGVertOffsets.buffer[getIndex3d(wgid.x, wgid.y, wgid.z, d.WGNum)] + atomicAdd(&localVertOffsetsAtom, vertNum);
        var vertOffset : u32 = WGVertOffsets.buffer[getIndex3d(wgid.x, wgid.y, wgid.z, d.WGNum)] + localVertOffsets[localIndex];
        //var indexOffset : u32 = WGIndexOffsets.buffer[getIndex3d(wgid.x, wgid.y, wgid.z, d.WGNum)] + atomicAdd(&localIndexOffsetsAtom, indexNum);
        var indexOffset : u32 = WGIndexOffsets.buffer[getIndex3d(wgid.x, wgid.y, wgid.z, d.WGNum)] + localIndexOffsets[localIndex];

        var i = 0u;
        loop {
            if (i == vertNum*3u) {
                break;
            }
            verts.buffer[3u*(vertOffset) + i] = thisVerts[i];
            normals.buffer[3u*(vertOffset) + i] = thisNormals[i];

            continuing {
                i = i + 1u;
            }
        }

        i = 0u;
        loop {
            if (i == indexNum) {
                break;
            }
            indices.buffer[indexOffset + i] = u32(tables.tri[code][i]) + vertOffset;//indexNum;//localIndexOffsets[localIndex] + i;//
            continuing {
                i = i + 1u;
            }
        }
    }
}
`;

// ################################################################################################################
function getNewBufferId() {
    var id = Object.keys(buffers).length;
        while (buffers.hasOwnProperty(String(id))) {
            id++;
        };
        return String(id);
}

const clearColor = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

// webgpu objects
var adapter;
var device;

var renderPipeline;
var marchPipeline;
var newMarchPipeline;
var prefixSumPipelines;
var enumeratePipeline

var prefixSumCommands;

// specific buffers for each mesh loaded
var buffers = {};
// contains matrices for rendering
var uniformBuffer;
// contains the threshold value + #vert + #ind
var marchVarsBuffer

var marchVertBuffer;
var marchNormalBuffer;
var marchIndexBuffer;

var marchVertReadBuffer;
var marchNormalReadBuffer;
var marchIndexReadBuffer;

var marchIndicesNumber = 0;

var constantsBindGroup;
var marchVarsBindGroup;
var vertexOffsetBindGroup;
var indexOffsetBindGroup;
var vertexOffsetBuffer;
var indexOffsetBuffer;
var vertexOffsetTotalsBuffer;
var indexOffsetTotalsBuffer;
var countReadBuffer;

var combinedOffsetBindGroup;

var readBuffer;

var bindGroup;

const transformThreshold = (threshold, dataObj) => {
    if (packing != 1) {
        var newThresh = (threshold-dataObj.limits[0])/(dataObj.limits[1]-dataObj.limits[0]);
        //console.log(newThresh);
        return newThresh;
    }
    //console.log(threshold)
    return threshold;
}


async function setupMarch(dataObj) {
    if (dataObj.data.constructor == Float32Array) {
        
    } else if (dataObj.data.constructor == Uint8Array) {
        packing = 4;
    } else {
        console.log("only float32 data values supported so far");
        return;
    }

    WGCount = {
        x: Math.ceil((dataObj.size[0]-1)/WGSize.x),
        y: Math.ceil((dataObj.size[1]-1)/WGSize.y),
        z: Math.ceil((dataObj.size[2]-1)/WGSize.z)
    }
    WGCount.val = WGCount.x*WGCount.y*WGCount.z;

    // create the enumaeration and marching cubes pipelines
    enumeratePipeline = createEnumeratePipeline();
    prefixSumPipelines = createPrefixSumPipelines();
    marchPipeline = createNewMarchPipeline();

    createBindGroups(dataObj);

    countReadBuffer = device.createBuffer({
        size: 2 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    readBuffer = device.createBuffer({
        size: 7776 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    prefixSumCommands = await recordPrefixSum();
}

function createConstantsBindGroupLayout() {
    return  device.createBindGroupLayout({
        entries: [
            // WG grid size + dims + data
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
                }
            },
            // tables 
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
                }
            }
        ]
    });
}

function createOffsetBindGroupLayout() {
    return  device.createBindGroupLayout({
        entries: [
            // the buffer of offsets
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            // the totals (total val + block prefix sum)
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ]
    });
}

function createEnumeratePipeline() {
    var enumerateModule = device.createShaderModule({
        code: enumerateCode
    });

    // first bind group is for the constant data (data, dimensions)
    var bindGroupLayout0 = createConstantsBindGroupLayout();

    // second is for holding threshold + vert + indices number
    var bindGroupLayout1 = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ]
    });

    // 2 and 3 are for the offset buffers
    var bindGroupLayout2 = createOffsetBindGroupLayout();
    var bindGroupLayout3 = createOffsetBindGroupLayout();

    var pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            bindGroupLayout0, 
            bindGroupLayout1, 
            bindGroupLayout2, 
            bindGroupLayout3
        ]
    });

    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: enumerateModule,
            entryPoint: "main"
        }
    });
}

function createBindGroups(dataObj) {
    // set the data and its dimensions
    {
        var dataBuffer = device.createBuffer({
            size: 32 + Math.ceil((dataObj.volume * 4/packing)/4)*4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        }); 

        var range = dataBuffer.getMappedRange()


        new Uint32Array(range, 0, 3).set(dataObj.size);

        new Uint32Array(range, 16, 3).set([WGCount.x, WGCount.y, WGCount.z]);

        if (packing == 1) {
            new Float32Array(range, 32, dataObj.volume).set(dataObj.data);
        } else if(packing == 4) {
            if (dataObj.data.constructor == Float32Array) {
                new Uint8Array(range, 32, dataObj.volume).set(Uint8Array.from(dataObj.data, (val) => {
                    return 255*(val-dataObj.limits[0])/(dataObj.limits[1]-dataObj.limits[0])
                }));
            } else if (dataObj.data.constructor == Uint8Array) {
                new Uint8Array(range, 32, dataObj.volume).set(dataObj.data);
            }
        }        

        dataBuffer.unmap();

        //set the various tables needed
        var tableBuffer = device.createBuffer({
            size: tablesLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        var range = tableBuffer.getMappedRange();
        var currOff = 0;
        for (let t of [vertCoordTable, edgeTable, edgeToVertsTable, triTable]) { 
            new Uint32Array(range, currOff*4, t.length).set(t);
            currOff += t.length;
        };

        tableBuffer.unmap();

        constantsBindGroup = device.createBindGroup({
            layout: enumeratePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: dataBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: tableBuffer
                    }
                }
            ]
        });
    }

    // create the buffer for threshold + #verts and #ind
    {
        marchVarsBuffer = device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT + 2*Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });

        marchVarsBindGroup = device.createBindGroup({
            layout: enumeratePipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: marchVarsBuffer
                    }
                }
            ]
        });

        
    }

    // create workgroupOffsets buffer
    {
        const WGCount = Math.ceil(dataObj.size[0]/WGSize.x) * Math.ceil(dataObj.size[1]/WGSize.y) * Math.ceil(dataObj.size[2]/WGSize.z);
        console.log("WGCount: "+ WGCount);
        const offsetBufferLength = Math.ceil(WGCount/(WGPrefixSumCount*2)) * WGPrefixSumCount * 2;
        const offsetTotalsBufferLength = 1 + WGPrefixSumCount*2;

        vertexOffsetBuffer = device.createBuffer({
            size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        vertexOffsetTotalsBuffer = device.createBuffer({
            size: offsetTotalsBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        indexOffsetBuffer = device.createBuffer({
            size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        indexOffsetTotalsBuffer = device.createBuffer({
            size: offsetTotalsBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        

        vertexOffsetBindGroup = device.createBindGroup({
            layout: enumeratePipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: vertexOffsetBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: vertexOffsetTotalsBuffer
                    }
                }
            ]
        });
        indexOffsetBindGroup = device.createBindGroup({
            layout: enumeratePipeline.getBindGroupLayout(3),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: indexOffsetBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: indexOffsetTotalsBuffer
                    }
                }
            ]
        });
    }

    // create combined offset bind group for march stage
    {
        combinedOffsetBindGroup = device.createBindGroup({
            layout: marchPipeline.getBindGroupLayout(3),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: vertexOffsetBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: indexOffsetBuffer
                    }
                }
            ]
        });
    }
}

function createPrefixSumPipelines() {
    const moduleA = device.createShaderModule({
        code: prefixSumA
    });
    const moduleB = device.createShaderModule({
        code: prefixSumB
    });

    var bindGroupLayout0 = device.createBindGroupLayout({
        entries: [
            // input buffer
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            // the totals buffer
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ]
    });

    var pipelineLayout = device.createPipelineLayout({bindGroupLayouts: [bindGroupLayout0]});         

    return [
        device.createComputePipeline({
            layout: pipelineLayout,
            compute: {
                module: moduleA,
                entryPoint: "main"
            }
        }),
        device.createComputePipeline({
            layout: pipelineLayout,
            compute: {
                module: moduleB,
                entryPoint: "main"
            }
        })
    ]
}

function createMarchPipeline() {
    const shaderModule = device.createShaderModule({
        code: marchCode
    });

    // 0 bind group is for the constant data
    var bindGroupLayout0 = createConstantsBindGroupLayout();

    // 1 is for vars (threshold, vert num, index num)
    var bindGroupLayout1 = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ]
    });

    
    // 2 is for writing vert pos, norm + indices
    var bindGroupLayout2 = device.createBindGroupLayout({
        entries: [
            // vert buffer
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            // normal buffer
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            // index buffer
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ]
    });

    var pipelineLayout = device.createPipelineLayout({bindGroupLayouts: [bindGroupLayout0, bindGroupLayout1, bindGroupLayout2]});

    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: shaderModule,
            entryPoint: "main"
        }
    });
}

function createNewMarchPipeline() {
    const shaderModule = device.createShaderModule({
        code: marchCodeNew
    });

    // 0 bind group is for the constant data
    var bindGroupLayout0 = createConstantsBindGroupLayout();

    // 1 is for vars (threshold, vert num, index num)
    var bindGroupLayout1 = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ]
    });

    
    // 2 is for writing vert pos, norm + indices
    var bindGroupLayout2 = device.createBindGroupLayout({
        entries: [
            // vert buffer
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            // normal buffer
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            // index buffer
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ]
    });

    // bg for offset buffers
    var bindGroupLayout3 = device.createBindGroupLayout({
        entries: [
            // vert offset buffer
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            // index offset buffer
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ]
    })

    var pipelineLayout = device.createPipelineLayout({bindGroupLayouts: [bindGroupLayout0, bindGroupLayout1, bindGroupLayout2, bindGroupLayout3]});

    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: shaderModule,
            entryPoint: "main"
        }
    });
}

function createMarchOutputBindGroup(vertNum, indexNum) {
    marchVertBuffer = device.createBuffer({
        size: 3 * vertNum * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
    }); 
    marchNormalBuffer = device.createBuffer({
        size: 3 * vertNum * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
    });
    marchIndexBuffer = device.createBuffer({
        size: indexNum * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.INDEX
    });
    
    return device.createBindGroup({
        layout: marchPipeline.getBindGroupLayout(2),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: marchVertBuffer
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: marchNormalBuffer
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: marchIndexBuffer
                }
            },
        ]
    })
}

function createMarchReadBuffers(vertNum, indexNum) {
    marchVertReadBuffer = device.createBuffer({
        size: 3 * vertNum * Float32Array.BYTES_PER_ELEMENT,
        usage:  GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    }); 
    marchNormalReadBuffer = device.createBuffer({
        size: 3 * vertNum * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    marchIndexReadBuffer = device.createBuffer({
        size: indexNum * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
}

async function recordPrefixSum() {  
    var prefixSumCommands = [];
    // prefix sum on verts
    const numBlocks = Math.ceil(WGCount.val/(WGPrefixSumCount*2));
    //console.log("numblock: " + numBlocks)
    var commandEncoder = await device.createCommandEncoder();

    // prefix sum on verts
    var passEncoder2 = commandEncoder.beginComputePass();
    passEncoder2.setPipeline(prefixSumPipelines[0]);
    passEncoder2.setBindGroup(0, vertexOffsetBindGroup);
    passEncoder2.dispatch(numBlocks);
    passEncoder2.endPass();

    // prefix sum on indices
    var passEncoder3 = commandEncoder.beginComputePass();
    passEncoder3.setPipeline(prefixSumPipelines[0]);
    passEncoder3.setBindGroup(0, indexOffsetBindGroup);
    passEncoder3.dispatch(numBlocks);
    passEncoder3.endPass();

    prefixSumCommands.push(commandEncoder.finish());

    if (numBlocks > 1) {
        // second pass if there are more than 1 blocks
        commandEncoder = await device.createCommandEncoder();
        // for verts
        var passEncoder4 = commandEncoder.beginComputePass();
        passEncoder4.setPipeline(prefixSumPipelines[1]);
        passEncoder4.setBindGroup(0, vertexOffsetBindGroup);
        passEncoder4.dispatch(1);
        passEncoder4.endPass();
        // for indices
        var passEncoder5 = commandEncoder.beginComputePass();
        passEncoder5.setPipeline(prefixSumPipelines[1]);
        passEncoder5.setBindGroup(0, indexOffsetBindGroup);
        passEncoder5.dispatch(1);
        passEncoder5.endPass();

        prefixSumCommands.push(commandEncoder.finish());
    }
    


    // copy values into correct buffers
    commandEncoder = await device.createCommandEncoder();

    commandEncoder.copyBufferToBuffer(vertexOffsetTotalsBuffer, 0, countReadBuffer, 0, 4);
    commandEncoder.copyBufferToBuffer(vertexOffsetTotalsBuffer, 0, marchVarsBuffer, 4, 4);
    commandEncoder.copyBufferToBuffer(indexOffsetTotalsBuffer, 0, countReadBuffer, 4, 4);
    commandEncoder.copyBufferToBuffer(indexOffsetTotalsBuffer, 0, marchVarsBuffer, 8, 4);

    prefixSumCommands.push(commandEncoder.finish());
    return prefixSumCommands;
}

async function march(dataObj, meshObj, threshold, bufferId) {
    var t0 = performance.now();

    var commandEncoder = device.createCommandEncoder();
    // take up a fair amount of time
    // implement as compute shaders if they become a bottleneck
    device.queue.writeBuffer(marchVarsBuffer, 0, new Float32Array([transformThreshold(threshold, dataObj), 0, 0]));
    device.queue.writeBuffer(vertexOffsetBuffer, 0, new Float32Array(Math.ceil(WGCount.val/(WGPrefixSumCount*2)) * WGPrefixSumCount * 2));
    device.queue.writeBuffer(indexOffsetBuffer, 0, new Float32Array(Math.ceil(WGCount.val/(WGPrefixSumCount*2)) * WGPrefixSumCount * 2));

    await commandEncoder;
    var passEncoder1 = commandEncoder.beginComputePass();
    
    passEncoder1.setPipeline(enumeratePipeline);
    passEncoder1.setBindGroup(0, constantsBindGroup);
    passEncoder1.setBindGroup(1, marchVarsBindGroup);
    passEncoder1.setBindGroup(2, vertexOffsetBindGroup);
    passEncoder1.setBindGroup(3, indexOffsetBindGroup);
    passEncoder1.dispatch(WGCount.x, WGCount.y, WGCount.z);
    passEncoder1.endPass();
    //commandEncoder.copyBufferToBuffer(marchVarsBuffer, 4, countReadBuffer, 0, 8);
    //commandEncoder.copyBufferToBuffer(indexOffsetBuffer, 0, readBuffer, 0, 100*4);

    device.queue.submit([commandEncoder.finish()])    

    // prefix sum pass ===================================================================
    // PROBLEM: when numblocks > 1
    const offsetTotalsBufferLength = 1 + WGPrefixSumCount*2;
    device.queue.writeBuffer(vertexOffsetTotalsBuffer, 0, new Uint32Array(offsetTotalsBufferLength));
    device.queue.writeBuffer(indexOffsetTotalsBuffer, 0, new Uint32Array(offsetTotalsBufferLength));
    
    
    {
        // prefix sum on verts
        const numBlocks = Math.ceil(WGCount.val/(WGPrefixSumCount*2));
        //console.log("numblock: " + numBlocks)
        commandEncoder = await device.createCommandEncoder();

        // prefix sum on verts
        var passEncoder2 = commandEncoder.beginComputePass();
        passEncoder2.setPipeline(prefixSumPipelines[0]);
        passEncoder2.setBindGroup(0, vertexOffsetBindGroup);
        passEncoder2.dispatch(numBlocks);
        passEncoder2.endPass();

        // prefix sum on indices
        var passEncoder3 = commandEncoder.beginComputePass();
        passEncoder3.setPipeline(prefixSumPipelines[0]);
        passEncoder3.setBindGroup(0, indexOffsetBindGroup);
        passEncoder3.dispatch(numBlocks);
        passEncoder3.endPass();

        //await device.queue.onSubmittedWorkDone();
        //device.queue.submit([commandEncoder.finish()])
        
        if (numBlocks > 1) {
            // second pass if there are more than 1 blocks
            //commandEncoder = await device.createCommandEncoder();
            // for verts
            var passEncoder4 = commandEncoder.beginComputePass();
            passEncoder4.setPipeline(prefixSumPipelines[1]);
            passEncoder4.setBindGroup(0, vertexOffsetBindGroup);
            passEncoder4.dispatch(1);
            passEncoder4.endPass();
            // for indices
            var passEncoder5 = commandEncoder.beginComputePass();
            passEncoder5.setPipeline(prefixSumPipelines[1]);
            passEncoder5.setBindGroup(0, indexOffsetBindGroup);
            passEncoder5.dispatch(1);
            passEncoder5.endPass();

            //await device.queue.onSubmittedWorkDone();
            //device.queue.submit([commandEncoder.finish()]);
        }

        // copy values into correct buffers
        //commandEncoder = await device.createCommandEncoder();

        commandEncoder.copyBufferToBuffer(vertexOffsetTotalsBuffer, 0, countReadBuffer, 0, 4);
        commandEncoder.copyBufferToBuffer(vertexOffsetTotalsBuffer, 0, marchVarsBuffer, 4, 4);
        commandEncoder.copyBufferToBuffer(indexOffsetTotalsBuffer, 0, countReadBuffer, 4, 4);
        commandEncoder.copyBufferToBuffer(indexOffsetTotalsBuffer, 0, marchVarsBuffer, 8, 4);
        
        //commandEncoder.copyBufferToBuffer(indexOffsetBuffer, 0, readBuffer, 0, 7776*4);

        //await device.queue.onSubmittedWorkDone();
        device.queue.submit([commandEncoder.finish()]);
    }
    
    //device.queue.submit(prefixSumCommands);
    
    await countReadBuffer.mapAsync(GPUMapMode.READ, 0, 8) 
    const lengths = new Uint32Array(countReadBuffer.getMappedRange());
    var vertNum = lengths[0];
    var indNum = lengths[1];
    //console.log("indices:", indNum);  
    countReadBuffer.unmap();

    // marching pass =====================================================================

    meshObj.indicesNum = indNum;

    if (vertNum == 0 || indNum == 0) {
        meshObj.verts = new Float32Array();
        meshObj.normals = new Float32Array();
        meshObj.indices = new Float32Array();
        console.log("yo, no verts")
        return;
    }
    var marchOutBindGroup = createMarchOutputBindGroup(vertNum, indNum);
    
    if (!bufferId) {
        createMarchReadBuffers(vertNum, indNum);
    };

    commandEncoder = device.createCommandEncoder();
    //device.queue.writeBuffer(marchVarsBuffer, 0, new Float32Array([threshold, 0, 0]));

    await commandEncoder;
    var passEncoder6 = commandEncoder.beginComputePass();
    
    // passEncoder6.setPipeline(marchPipeline);
    // passEncoder6.setBindGroup(0, constantsBindGroup);
    // passEncoder6.setBindGroup(1, marchVarsBindGroup);
    // passEncoder6.setBindGroup(2, marchOutBindGroup);
    // passEncoder6.dispatch(
    //     Math.ceil(dataObj.size[0]/WGSize.x),
    //     Math.ceil(dataObj.size[1]/WGSize.y),
    //     Math.ceil(dataObj.size[2]/WGSize.z)
    // );
    passEncoder6.setPipeline(marchPipeline);
    passEncoder6.setBindGroup(0, constantsBindGroup);
    passEncoder6.setBindGroup(1, marchVarsBindGroup);
    passEncoder6.setBindGroup(2, marchOutBindGroup);
    passEncoder6.setBindGroup(3, combinedOffsetBindGroup);
    passEncoder6.dispatch(
        Math.ceil(dataObj.size[0]/WGSize.x),
        Math.ceil(dataObj.size[1]/WGSize.y),
        Math.ceil(dataObj.size[2]/WGSize.z)
    );

    passEncoder6.endPass();

    //commandEncoder.copyBufferToBuffer(marchIndexBuffer, 0, readBuffer, 0, 7776*4);

    if (!bufferId) {
        commandEncoder.copyBufferToBuffer(marchVertBuffer, 0, marchVertReadBuffer, 0, vertNum * 3 * 4);
        commandEncoder.copyBufferToBuffer(marchNormalBuffer, 0, marchNormalReadBuffer, 0, vertNum * 3 * 4);
        commandEncoder.copyBufferToBuffer(marchIndexBuffer, 0, marchIndexReadBuffer, 0, indNum * 4);
    };

    device.queue.submit([commandEncoder.finish()])

    // readBuffer.mapAsync(GPUMapMode.READ, 0, 7776*4).then(() => {
    //     var offsets = new Uint32Array(readBuffer.getMappedRange(0, 7776*4)); 
    //     var log = false;
    //     var out = "";
    //     for (let i = 0; i < offsets.length; i++) {
    //         if(offsets[i] != 6) {
    //             log = true;
    //         }
    //         out += offsets[i] + ", ";
    //     }
    //     if (log) console.log(out);        
    //     readBuffer.unmap();
    // });

    

    if(!bufferId) {
        await marchVertReadBuffer.mapAsync(GPUMapMode.READ);
        meshObj.verts = new Float32Array(marchVertReadBuffer.getMappedRange()).slice(0);
        marchVertReadBuffer.unmap();

        await marchNormalReadBuffer.mapAsync(GPUMapMode.READ)
        meshObj.normals = new Float32Array(marchNormalReadBuffer.getMappedRange()).slice(0);
        marchNormalReadBuffer.unmap();

        await marchIndexReadBuffer.mapAsync(GPUMapMode.READ)
        meshObj.indices = new Uint32Array(marchIndexReadBuffer.getMappedRange()).slice(0);
        marchIndexReadBuffer.unmap();
    } else {
        destroyBuffer(buffers[bufferId].vertex.buffer);
        buffers[bufferId].vertex.buffer = marchVertBuffer;
        destroyBuffer(buffers[bufferId].normal.buffer);
        buffers[bufferId].normal.buffer = marchNormalBuffer;
        destroyBuffer(buffers[bufferId].index.buffer);
        buffers[bufferId].index.buffer = marchIndexBuffer;
    }

    // delete all the temporary buffers
    

    if (!bufferId) {
        destroyBuffer(marchVertBuffer);
        destroyBuffer(marchNormalBuffer);
        destroyBuffer(marchIndexBuffer);    
        destroyBuffer(marchVertReadBuffer);
        destroyBuffer(marchNormalReadBuffer);
        destroyBuffer(marchIndexReadBuffer);
    };
    
    console.log("took: " + Math.round(performance.now()-t0) + "ms");
}

// document.body.onkeydown = () => {
//     readBuffer.mapAsync(GPUMapMode.READ, 0, 7776*4).then(() => {
//         var offsets = new Uint32Array(readBuffer.getMappedRange(0, 7776*4)); 
//         var out = "";
//         for (let i = 0; i < offsets.length; i++) {
//             out += offsets[i] + ", ";
//         }
//         console.log(out);
//         readBuffer.unmap();
//     });
// }

// rendering functions =================================================================================

async function setupRenderer(canvas) {
    adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
    });
    device = await adapter.requestDevice();

    var ctx = canvas.getContext("webgpu");

    // setup swapchain
    ctx.configure({
        device: device,
        format: 'bgra8unorm'
    });

    // TODO: seperate pipeline for rendering views and copying to main texture

    renderPipeline = createRenderPipeline();

    uniformBuffer = device.createBuffer({
        size: 16*2*Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    bindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {
                buffer: uniformBuffer
            }
        }]
    });

    return ctx;
}

function createRenderPipeline() {
    // compile shader code
    const shaderModule = device.createShaderModule({
        code: shaderCode
    });

    const vertexLayout = [
        {
            attributes: [{
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3'
            }],
            arrayStride: 12,
            stepMode: 'vertex'
        },
        {
            attributes: [{
                shaderLocation: 1,
                offset: 0,
                format: 'float32x3'
            }],
            arrayStride: 12,
            stepMode: 'vertex'
        }
    ];

    var bindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
            }
        }]
    });

    var pipelineLayout = device.createPipelineLayout({bindGroupLayouts: [bindGroupLayout]})
    
    // pipeline descriptor
    const pipelineDescriptor = {
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: "vertex_main",
            buffers: vertexLayout
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [{
                format: "bgra8unorm"
            }]
        },
        primitive: {
            topology: "triangle-list"
        },
        depthStencil: {
            format: "depth32float",
            depthWriteEnabled : true,
            depthCompare: "less"
        }
    };

    // create the rendering pipeline
    return device.createRenderPipeline(pipelineDescriptor);
}

function createBuffers() {
    const id = getNewBufferId()
    buffers[id] = {
        vertex: {
            buffer: null,
            byteLength: 0
        },
        normal: {
            buffer: null,
            byteLength: 0
        },
        index: {
            buffer: null,
            byteLength: 0
        }
    }
    return id;
}

function createFilledBuffer(type, data, usage) {
    const byteLength = data.byteLength;
    var buffer = device.createBuffer({
        size: byteLength,
        usage: usage,
        mappedAtCreation: true
    });
    if (type == "f32") {
        new Float32Array(buffer.getMappedRange()).set(data);
    } else if (type == "u32") {
        new Uint32Array(buffer.getMappedRange()).set(data);
    } else if (type = "u8") {
        new Uint8Array(buffer.getMappedRange()).set(data);
    }
    
    buffer.unmap();
    return buffer;
}

function updateBuffers(mesh, id) {
    destroyBuffer(buffers[id].vertex.buffer);
    buffers[id].vertex.buffer = createFilledBuffer("f32", mesh.verts, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);

    destroyBuffer(buffers[id].normal.buffer);
    buffers[id].normal.buffer = createFilledBuffer("f32", mesh.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);

    destroyBuffer(buffers[id].index.buffer);
    buffers[id].index.buffer = createFilledBuffer("u32", mesh.indices, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
}

function destroyBuffer(buffer) {
    if (buffer !== null) {
        buffer.destroy();
    }
}

function deleteBuffers(id) {
    buffers?.[id].vertex.buffer?.destroy();
    buffers?.[id].normal.buffer?.destroy();
    buffers?.[id].index.buffer?.destroy();
    delete buffers[id];
};

function clearScreen() {};

async function renderView(ctx, projMat, modelViewMat, box, indicesNum, id) {
    if (!buffers[id] || !buffers[id].vertex.buffer) return;

    var commandEncoder = device.createCommandEncoder();
    // provide details of load and store part of pass
    // here there is one color output that will be cleared on load

    var depthStencilTexture = device.createTexture({
        size: {
          width: ctx.canvas.width,
          height: ctx.canvas.height,
          depth: 1
        },
        dimension: '2d',
        format: 'depth32float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    const renderPassDescriptor = {
        colorAttachments: [{
            loadValue: clearColor,
            storeOp: "store",
            view: ctx.getCurrentTexture().createView()
        }],
        depthStencilAttachment: {
            depthLoadValue: 1.0,
            depthStoreOp: 'discard',
            stencilLoadValue: 0,
            stencilStoreOp: 'store',
            view: depthStencilTexture.createView()
          }
    };

    // write uniforms to buffer
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([...projMat, ...modelViewMat]))

    await commandEncoder;
    
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setViewport(box.left, box.top, box.width, box.height, 0, 1);
    passEncoder.setScissorRect(box.left, box.top, box.width, box.height);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setIndexBuffer(buffers[id].index.buffer, "uint32");
    passEncoder.setVertexBuffer(0, buffers[id].vertex.buffer);
    passEncoder.setVertexBuffer(1, buffers[id].normal.buffer);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.drawIndexed(indicesNum);
    passEncoder.endPass();

    device.queue.submit([commandEncoder.finish()]);

    depthStencilTexture.destroy();
}

async function renderFrame() {
    var commandEncoder = device.createCommandEncoder();
    var canvasTexture = ctx.getCurrentTexture();
    const renderPassDescriptor = {
        colorAttachments: [{
            loadValue: clearColor,
            storeOp: "store",
            view: canvasTexture.createView()
        }]
    };

    await commandEncoder;

    // need different pass descriptor
    //const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    
    for (view in Object.keys(/*view storage object*/)) {
        if (view.frameTexture) {
            passEncoder.copyTextureToTexture(view.frameTexture, canvasTexture, )
        }
    }
    passEncoder.endPass();

    device.queue.submit([commandEncoder.finish()]);

    // create a textureview for the whole canvas
    // access the framebuffers for each view
    // for (view in views) {
    // device.
    // copy each 
}