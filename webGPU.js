// webgpu.js
// handles the webgpu api
// generating mesh and rendering

import { stringFormat, clampBox } from "./utils.js";

export {setupMarchModule, setupMarch, march, marchFine, setupRenderer, createBuffers, updateBuffers, renderView, deleteBuffers, clearScreen, resizeRenderingContext};


const WGSize = {
    x: 4,
    y: 4,
    z: 4
}

const WGPrefixSumCount = 256;

//var WGCount = {};

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

// a mapping from relative coordinates of where the point is adjacent to neighbouring cells
// to a code
const neighbourTable = [
    0, 0, 0, // 0 (points in the body)
    0, 0, 1, // 1 z+ face
    0, 1, 0, // 2 y+ face
    0, 1, 1, // 3 x+ edge
    1, 0, 0, // 4 x+ face
    1, 0, 1, // 5 y+ edge
    1, 1, 0, // 6 z+ edge
    1, 1, 1  // 7 corner
]

// for each entry 
const neighbourCellsTable = [
    -1, -1, -1, -1, -1, -1, -1, // the cell itself
     1, -1, -1, -1, -1, -1, -1, // z+ face neighbour
     2, -1, -1, -1, -1, -1, -1, // y+ face neighbour
     1,  2,  3, -1, -1, -1, -1, // x+ edge neighbour
     4, -1, -1, -1, -1, -1, -1, // x+ face neighbour
     1,  4,  5, -1, -1, -1, -1, // y+ edge neighbour
     2,  4,  6, -1, -1, -1, -1,// z+ edge neighbour
     1,  2,  3,  4,  5,  6,  7// corner neighbour 

]

const tablesLength = vertCoordTable.length + edgeTable.length + edgeToVertsTable.length + triTable.length + neighbourCellsTable.length;

// shader programs ################################################################################################
function fetchShader(name) {
    return fetch("shaders/" + name + ".wgsl").then(response => response.text());
}

var shaderCode = fetchShader("shader");

var enumerateCode = fetchShader("enumerate");
var enumerateFineCode = fetchShader("enumerateFine");

// general prefix sum applied to the buffer in group(0) binding(0)
var prefixSumACode = fetchShader("prefixSumA");
var prefixSumBCode = fetchShader("prefixSumB");

var marchCode = fetchShader("march");
var marchFineCode = fetchShader("marchFine");

// ################################################################################################################
function getNewBufferId() {
    var id = Object.keys(buffers).length;
        while (buffers.hasOwnProperty(String(id))) {
            id++;
        };
        return String(id);
}

async function setupWebGPU() {
    adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
    });
    device = await adapter.requestDevice({
        maxStorageBufferBindingSize: 2
    });
    console.log(device.limits);
}

const clearColor = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

// webgpu objects
var adapter;
var device;

var renderPipeline;

// specific buffers for each mesh loaded
var buffers = {};
// contains matrices for rendering
var uniformBuffer;

var marchVertBuffer;
var marchNormalBuffer;
var marchIndexBuffer;

var marchVertReadBuffer;
var marchNormalReadBuffer;
var marchIndexReadBuffer;

var bindGroup;

// holds all the global data for marching operations
var marchData = {
    buffers: {},
    bindGroups: {},
    bindGroupLayouts: {},
    pipelines: {}
}

const transformThreshold = (threshold, dataObj) => {
    if (packing != 1) {
        var newThresh = (threshold-dataObj.limits[0])/(dataObj.limits[1]-dataObj.limits[0]);
        //console.log(newThresh);
        return newThresh;
    }
    //console.log(threshold)
    return threshold;
}

async function setupMarchModule() {
    if (!device) {
        await setupWebGPU();
    }
    marchData.buffers.countReadBuffer = device.createBuffer({
        size: 2 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    marchData.buffers.readBuffer = device.createBuffer({
        size: 7776 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    createGlobalBuffers();
    createBindGroupLayouts();
    createGlobalBindGroups();

    prefixSumACode = await prefixSumACode;
    prefixSumBCode = await prefixSumBCode;

    marchData.pipelines.prefix = createPrefixSumPipelines();
}

function createGlobalBuffers() {
    //set the various tables needed
    var tableBuffer = device.createBuffer({
        size: tablesLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });

    var range = tableBuffer.getMappedRange();
    var currOff = 0;
    for (let t of [vertCoordTable, edgeTable, edgeToVertsTable, triTable, neighbourCellsTable]) { 
        new Int32Array(range, currOff*4, t.length).set(t);
        currOff += t.length;
    };

    tableBuffer.unmap();

    marchData.buffers.tables = tableBuffer;

    
    var marchVarsBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT + 3*Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    marchData.buffers.marchVars = marchVarsBuffer;

    
    const offsetTotalsBufferLength = 2 + WGPrefixSumCount*2;
    
    var vertexOffsetTotalsBuffer = device.createBuffer({
        size: offsetTotalsBufferLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    var indexOffsetTotalsBuffer = device.createBuffer({
        size: offsetTotalsBufferLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });

    var bufferOffsetBuffer = device.createBuffer({
        size: 1 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });


    marchData.buffers.vertexOffsetTotals = vertexOffsetTotalsBuffer;
    marchData.buffers.indexOffsetTotals = indexOffsetTotalsBuffer;
    marchData.buffers.bufferOffset = bufferOffsetBuffer;
    
    var readBuffer = device.createBuffer({
        size: 64 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    marchData.buffers.read = readBuffer;

}

function createGlobalBindGroups() {
    marchData.bindGroups.tables = device.createBindGroup({
        layout: marchData.bindGroupLayouts.enumerateFine[0],
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: marchData.buffers.tables
                }
            }
        ]
    });

    marchData.bindGroups.marchVars = device.createBindGroup({
        layout: marchData.bindGroupLayouts.enumerate[1],
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: marchData.buffers.marchVars
                }
            }
        ]
    });

    marchData.bindGroups.bufferOffset = device.createBindGroup({
        layout: marchData.bindGroupLayouts.prefix[1],
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: marchData.buffers.bufferOffset
                }
            }
        ]
    });
}

function createBindGroupLayouts() {
    var bindGroupLayoutA = createConstantsBindGroupLayout();

    var bindGroupLayoutB = device.createBindGroupLayout({
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

    var bindGroupLayoutC = createOffsetBindGroupLayout();
    
    var bindGroupLayoutD = device.createBindGroupLayout({
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

    var bindGroupLayoutE = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
                }
            }
        ]
    });

    var bindGroupLayoutF = device.createBindGroupLayout({
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

    var bindGroupLayoutG = device.createBindGroupLayout({
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
    });

    var bindGroupLayoutH = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
                }
            }
        ]
    })

    marchData.bindGroupLayouts.enumerate = [
        bindGroupLayoutA,
        bindGroupLayoutB,
        bindGroupLayoutC,
        bindGroupLayoutC
    ];

    marchData.bindGroupLayouts.enumerateFine = [
        bindGroupLayoutE,
        bindGroupLayoutH,
        bindGroupLayoutG
    ];

    marchData.bindGroupLayouts.prefix = [
        bindGroupLayoutD,
        bindGroupLayoutE
    ];

    marchData.bindGroupLayouts.march = [
        bindGroupLayoutA,
        bindGroupLayoutB,
        bindGroupLayoutF,
        bindGroupLayoutG
    ];

    marchData.bindGroupLayouts.marchFine = [
        bindGroupLayoutE,
        bindGroupLayoutH,
        bindGroupLayoutD,
        bindGroupLayoutG
    ];

}

function getWGCount(dataObj) {
    const cellScale = dataObj.marchData.cellScale;
    var WGCount = {
        x: Math.ceil((dataObj.size[0]-1)/(WGSize.x * cellScale)),
        y: Math.ceil((dataObj.size[1]-1)/(WGSize.y * cellScale)),
        z: Math.ceil((dataObj.size[2]-1)/(WGSize.z * cellScale))
    }
    WGCount.val = WGCount.x*WGCount.y*WGCount.z;

    dataObj.marchData.WGCount = WGCount;
}

async function setupMarch(dataObj) { 
    // temp, move to main when there is function to get device
    if (Object.keys(marchData.buffers).length == 0) {
        setupMarchModule(); 
    }

    dataObj.marchData.cellScale = 1;
      
    dataObj.marchData.packing = 1;
    if (dataObj.data.constructor == Float32Array) {
        dataObj.marchData.packing = 1;
    } else if (dataObj.data.constructor == Uint8Array) {
        dataObj.marchData.packing = 4;
    } else {
        console.log("only float32 and uint8 data values supported so far");
        return;
    }

    getWGCount(dataObj);

    enumerateCode = await enumerateCode;
    
    marchCode = await marchCode;

    // create the enumaeration and marching cubes pipelines
    
    dataObj.marchData.pipelines = {
        enumerate: createEnumeratePipeline(dataObj),
        march: createMarchPipeline(dataObj)
    }
    
    createBindGroups(dataObj);   
    
    if (dataObj.complex) {
        console.log("setting up compex dataset")
        enumerateFineCode = await enumerateFineCode;
        marchFineCode = await marchFineCode;

        // create the pipelines
        dataObj.marchData.pipelines = {
            ...dataObj.marchData.pipelines,
            enumerateFine: createEnumerateFinePipeline(dataObj),
            marchFine: createMarchFinePipeline(dataObj)
        }
    }

    
}

function createBindGroups(dataObj) {
    dataObj.marchData.bindGroups = {};
    dataObj.marchData.buffers = {};
    // set the data and its dimensions
    const packing = dataObj.marchData.packing;
    const WGCount = dataObj.marchData.WGCount;
    {
        var dataBuffer = device.createBuffer({
            size: 48 + Math.ceil((dataObj.volume * 4/packing)/4)*4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        }); 

        var range = dataBuffer.getMappedRange();

        // keep a track of where to write into data buffer
        var nextPtr = 0;

        new Uint32Array(range, nextPtr, 3).set(dataObj.size);
        nextPtr += 16

        new Uint32Array(range, nextPtr, 3).set([WGCount.x, WGCount.y, WGCount.z]);
        nextPtr += 16;

        new Float32Array(range, nextPtr, 3).set(dataObj.cellSize);
        nextPtr += 16;

        var data = dataObj.data;

        if (packing == 1) {
            new Float32Array(range, nextPtr, dataObj.volume).set(data);
        } else if(packing == 4) {
            if (data.constructor == Float32Array) {
                new Uint8Array(range, nextPtr, dataObj.volume).set(Uint8Array.from(data, (val) => {
                    return 255*(val-dataObj.limits[0])/(dataObj.limits[1]-dataObj.limits[0])
                }));
            } else if (data.constructor == Uint8Array) {
                new Uint8Array(range, nextPtr, dataObj.volume).set(data);
            }
        }        

        dataBuffer.unmap();

        dataObj.marchData.buffers.data = dataBuffer;

        dataObj.marchData.bindGroups.constants = device.createBindGroup({
            layout: dataObj.marchData.pipelines.enumerate.getBindGroupLayout(0),
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
                        buffer: marchData.buffers.tables
                    }
                }
            ]
        });
    }

    createOffsetBindGroups(dataObj);
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

function createEnumeratePipeline(dataObj) {
    const enumerateCodeFormatted = stringFormat(enumerateCode, {
        "packing": dataObj.marchData.packing,
        "WGSizeX": WGSize.x,
        "WGSizeY": WGSize.y,
        "WGSizeZ": WGSize.z,
        "WGVol": WGSize.x * WGSize.y * WGSize.z
    })
    var enumerateModule = device.createShaderModule({
        code: enumerateCodeFormatted
    });

    var pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: marchData.bindGroupLayouts.enumerate
    });

    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: enumerateModule,
            entryPoint: "main"
        }
    });
}

function createEnumerateFinePipeline(dataObj) {
    const codeFormatted = stringFormat(enumerateFineCode, {
        "packing": dataObj.marchData.packing,
        "WGSizeX": WGSize.x,
        "WGSizeY": WGSize.y,
        "WGSizeZ": WGSize.z,
        "WGVol": WGSize.x * WGSize.y * WGSize.z
    })
    var module = device.createShaderModule({
        code: codeFormatted
    });

    var pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: marchData.bindGroupLayouts.enumerateFine
    });

    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: module,
            entryPoint: "main"
        }
    });
}

function createPrefixSumPipelines() {
    const prefixSumACodeFormatted = stringFormat(prefixSumACode, {
        "WGPrefixSumCount": WGPrefixSumCount
    })
    const moduleA = device.createShaderModule({
        code: prefixSumACodeFormatted
    });
    const prefixSumBCodeFormatted = stringFormat(prefixSumBCode, {
        "WGPrefixSumCount": WGPrefixSumCount
    })
    const moduleB = device.createShaderModule({
        code: prefixSumBCodeFormatted
    });

    var pipelineLayout = device.createPipelineLayout({bindGroupLayouts: marchData.bindGroupLayouts.prefix});         

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

function createMarchPipeline(dataObj) {
    const marchCodeFormatted = stringFormat(marchCode, {
        "packing": dataObj.marchData.packing,
        "WGSizeX": WGSize.x,
        "WGSizeY": WGSize.y,
        "WGSizeZ": WGSize.z,
        "WGVol": WGSize.x * WGSize.y * WGSize.z
    })
    const shaderModule = device.createShaderModule({
        code: marchCodeFormatted
    });

    var pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: marchData.bindGroupLayouts.march
    });

    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: shaderModule,
            entryPoint: "main"
        }
    });
}

function createMarchFinePipeline(dataObj) {
    const codeFormatted = stringFormat(marchFineCode, {
        "packing": dataObj.marchData.packing,
        "WGSizeX": WGSize.x,
        "WGSizeY": WGSize.y,
        "WGSizeZ": WGSize.z,
        "WGVol": WGSize.x * WGSize.y * WGSize.z
    })
    var module = device.createShaderModule({
        code: codeFormatted
    });

    var pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: marchData.bindGroupLayouts.marchFine
    });

    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: module,
            entryPoint: "main"
        }
    });
}

function createMarchOutputBindGroup(vertNum, indexNum, dataObj) {
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
        layout: dataObj.marchData.pipelines.march.getBindGroupLayout(2),
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

function createMarchFineOutputBindGroup(vertNum, indexNum, dataObj) {
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
        layout: dataObj.marchData.pipelines.marchFine.getBindGroupLayout(2),
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

function createOffsetBindGroups(dataObj) {
    const WGCount = dataObj.marchData.WGCount;
    const offsetBufferLength = Math.ceil(WGCount.val/(WGPrefixSumCount*2)) * WGPrefixSumCount*2;
    //console.log("WGCount: "+ WGCount.val);
    
    var vertexOffsetBuffer = device.createBuffer({
        size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    
    var indexOffsetBuffer = device.createBuffer({
        size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });

    dataObj.marchData.buffers.vertexOffset = vertexOffsetBuffer;
    dataObj.marchData.buffers.indexOffset = indexOffsetBuffer;        

    dataObj.marchData.bindGroups.vertexOffset = device.createBindGroup({
        layout: dataObj.marchData.pipelines.enumerate.getBindGroupLayout(2),
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
                    buffer: marchData.buffers.vertexOffsetTotals
                }
            }
        ]
    });

    dataObj.marchData.bindGroups.indexOffset = device.createBindGroup({
        layout: dataObj.marchData.pipelines.enumerate.getBindGroupLayout(3),
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
                    buffer: marchData.buffers.indexOffsetTotals
                }
            }
        ]
    });

    // combined offset buffers into one bg
    dataObj.marchData.bindGroups.combinedOffset = device.createBindGroup({
        layout: dataObj.marchData.pipelines.march.getBindGroupLayout(3),
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

async function getMarchCounts(dataObj, threshold) {
    const WGCount = dataObj.marchData.WGCount;
    //console.log(WGCount);
    //const buffers 

    //var t0 = performance.now();
    //console.log(transformThreshold(threshold, dataObj))

    var commandEncoder = device.createCommandEncoder();
    // take up a fair amount of time
    // implement as compute shaders if they become a bottleneck
    device.queue.writeBuffer(dataObj.marchData.buffers.data, 16, new Uint32Array([WGCount.x, WGCount.y, WGCount.z]));
    device.queue.writeBuffer(marchData.buffers.marchVars, 0, new Float32Array([transformThreshold(threshold, dataObj), 0, 0]));
    device.queue.writeBuffer(marchData.buffers.marchVars, 12, new Uint32Array([dataObj.marchData.cellScale]));

    device.queue.writeBuffer(dataObj.marchData.buffers.vertexOffset, 0, new Float32Array(Math.ceil(WGCount.val/(WGPrefixSumCount*2)) * WGPrefixSumCount * 2));
    device.queue.writeBuffer(dataObj.marchData.buffers.indexOffset, 0, new Float32Array(Math.ceil(WGCount.val/(WGPrefixSumCount*2)) * WGPrefixSumCount * 2));

    await commandEncoder;
    var passEncoder1 = commandEncoder.beginComputePass();
    
    passEncoder1.setPipeline(dataObj.marchData.pipelines.enumerate);
    passEncoder1.setBindGroup(0, dataObj.marchData.bindGroups.constants);
    passEncoder1.setBindGroup(1, marchData.bindGroups.marchVars);
    passEncoder1.setBindGroup(2, dataObj.marchData.bindGroups.vertexOffset);
    passEncoder1.setBindGroup(3, dataObj.marchData.bindGroups.indexOffset);
    passEncoder1.dispatchWorkgroups(WGCount.x, WGCount.y, WGCount.z);
    passEncoder1.end();

    device.queue.submit([commandEncoder.finish()])    

    // prefix sum pass ===================================================================
    const offsetTotalsBufferLength = 2 + WGPrefixSumCount*2;
    device.queue.writeBuffer(marchData.buffers.vertexOffsetTotals, 0, new Uint32Array(offsetTotalsBufferLength));
    device.queue.writeBuffer(marchData.buffers.indexOffsetTotals, 0, new Uint32Array(offsetTotalsBufferLength));
    
    // prefix sum on verts
    // starts as total number of values in totals
    const numBlocks = Math.ceil(WGCount.val/(WGPrefixSumCount*2));
    var thisNumBlocks
    var OffsetIntoOffsetBuffer = 0;
    
    const elems = 32;
    const totalsClearArray = new Uint32Array(WGPrefixSumCount*2);

    //                  number of rounds to do
    for (let i = 0; i < numBlocks/(WGPrefixSumCount*2); i++) {
        //console.log("round " + i)
        device.queue.writeBuffer(marchData.buffers.bufferOffset, 0, Uint32Array.from([OffsetIntoOffsetBuffer]));
        if (i > 0) {
            device.queue.writeBuffer(marchData.buffers.vertexOffsetTotals, 2*4, totalsClearArray);
            device.queue.writeBuffer(marchData.buffers.indexOffsetTotals, 2*4, totalsClearArray);
        }
        // set to 512 for now
        thisNumBlocks = Math.max(2, Math.min(WGPrefixSumCount*2, numBlocks-OffsetIntoOffsetBuffer));
        
        //console.log(thisNumBlocks);
        
        //console.log("numblock: " + numBlocks)
        commandEncoder = await device.createCommandEncoder();
        
        
        
        // prefix sum on verts
        var passEncoder2 = commandEncoder.beginComputePass();
        passEncoder2.setPipeline(marchData.pipelines.prefix[0]);
        passEncoder2.setBindGroup(0, dataObj.marchData.bindGroups.vertexOffset);
        passEncoder2.setBindGroup(1, marchData.bindGroups.bufferOffset);
        passEncoder2.dispatchWorkgroups(thisNumBlocks);
        passEncoder2.end();

        // prefix sum on indices
        var passEncoder3 = commandEncoder.beginComputePass();
        passEncoder3.setPipeline(marchData.pipelines.prefix[0]);
        passEncoder3.setBindGroup(0, dataObj.marchData.bindGroups.indexOffset);
        passEncoder3.setBindGroup(1, marchData.bindGroups.bufferOffset);

        passEncoder3.dispatchWorkgroups(thisNumBlocks);
        passEncoder3.end();

        //commandEncoder.copyBufferToBuffer(vertexOffsetBuffer, 256*4*128*2, readBuffer, 0, 4*elems);

        //commandEncoder.copyBufferToBuffer(vertexOffsetTotalsBuffer, 0, readBuffer, 0, 4*16);
        

        //await device.queue.onSubmittedWorkDone();
        //device.queue.submit([commandEncoder.finish()])
        
        if (numBlocks > 0) {
            var passEncoder4 = commandEncoder.beginComputePass();
            passEncoder4.setPipeline(marchData.pipelines.prefix[1]);
            passEncoder4.setBindGroup(0, dataObj.marchData.bindGroups.vertexOffset);
            passEncoder4.setBindGroup(1, marchData.bindGroups.bufferOffset);

            passEncoder4.dispatchWorkgroups(1);
            passEncoder4.end();
            // for indices
            var passEncoder5 = commandEncoder.beginComputePass();
            passEncoder5.setPipeline(marchData.pipelines.prefix[1]);
            passEncoder5.setBindGroup(0, dataObj.marchData.bindGroups.indexOffset);
            passEncoder5.setBindGroup(1, marchData.bindGroups.bufferOffset);

            passEncoder5.dispatchWorkgroups(1);
            passEncoder5.end();
        }

        await device.queue.onSubmittedWorkDone();
        device.queue.submit([commandEncoder.finish()]);

        // await readBuffer.mapAsync(GPUMapMode.READ, 0, 4*elems)
        // console.log(new Uint32Array(readBuffer.getMappedRange(0, 4*elems)));
        // readBuffer.unmap();

        OffsetIntoOffsetBuffer += thisNumBlocks;
    }
    // copy values into correct buffers
    commandEncoder = await device.createCommandEncoder();

    commandEncoder.copyBufferToBuffer(marchData.buffers.vertexOffsetTotals, 4, marchData.buffers.countReadBuffer, 0, 4);
    commandEncoder.copyBufferToBuffer(marchData.buffers.vertexOffsetTotals, 4, marchData.buffers.marchVars, 4, 4);
    commandEncoder.copyBufferToBuffer(marchData.buffers.indexOffsetTotals, 4, marchData.buffers.countReadBuffer, 4, 4);
    commandEncoder.copyBufferToBuffer(marchData.buffers.indexOffsetTotals, 4, marchData.buffers.marchVars, 8, 4);
    
    //commandEncoder.copyBufferToBuffer(indexOffsetBuffer, 0, readBuffer, 0, 7776*4);

    //await device.queue.onSubmittedWorkDone();
    device.queue.submit([commandEncoder.finish()]);
    
    //device.queue.submit(prefixSumCommands);
    
    await marchData.buffers.countReadBuffer.mapAsync(GPUMapMode.READ, 0, 8) 
    const lengths = new Uint32Array(marchData.buffers.countReadBuffer.getMappedRange());
    var vertNum = lengths[0];
    var indNum = lengths[1];
    //console.log("verts:", vertNum, indNum);  
    marchData.buffers.countReadBuffer.unmap();

    return [vertNum, indNum];
}

async function march(dataObj, meshObj, threshold) {
    
    // enumeration pass =====================================================================
    // finds the correct resolution to generate the mesh at and creates a per-WG offset buffer for
    // verts and indices
    var vertNum, indNum;

    var triedScales = new Set();
    var workingScales = new Set();
    var currScale;
    var maxSize;
    var maxStorage = device.limits.maxStorageBufferBindingSize;
    
    while (true) {
        currScale = dataObj.marchData.cellScale
        //console.log(currScale);
        triedScales.add(currScale);

        createOffsetBindGroups(dataObj);
        [vertNum, indNum] = await getMarchCounts(dataObj, threshold);

        maxSize = Math.max(vertNum*3*4, indNum*4);

        //console.log(maxSize/maxStorage);
        if (maxSize > maxStorage) {
            // increase the scale for more room
            dataObj.marchData.cellScale++;

            dataObj.marchData.buffers.vertexOffset.destroy();
            dataObj.marchData.buffers.indexOffset.destroy();
            getWGCount(dataObj);
            createOffsetBindGroups(dataObj);
        } else if (currScale > 1 && maxSize <= maxStorage*Math.pow((currScale-1)/currScale, 2)) {
            //console.log("tried increasing")
            // decrease the scale if we can
            workingScales.add(currScale);
            const newScale = currScale - 1;
            if (triedScales.has(newScale)) {
                //console.log("already tried ", newScale)
                break;
            } else {
                dataObj.marchData.cellScale = newScale;

                dataObj.marchData.buffers.vertexOffset.destroy();
                dataObj.marchData.buffers.indexOffset.destroy();
                getWGCount(dataObj);
                createOffsetBindGroups(dataObj);
            }
        } else {
            break;
        }
    }
    //console.log(currScale)
    //console.log(currScale);

    //console.log("coarse vert + ind:", vertNum, indNum);
    // marching pass =====================================================================

    meshObj.indicesNum = indNum;
    meshObj.vertNum = vertNum;

    if (vertNum == 0 || indNum == 0) {
        meshObj.verts = new Float32Array();
        meshObj.normals = new Float32Array();
        meshObj.indices = new Float32Array();
        console.log("no verts")
        return;
    }

    deleteBuffers(meshObj);

    var marchOutBindGroup = createMarchOutputBindGroup(vertNum, indNum, dataObj, false);
    
    // set the buffers in the mesh
    meshObj.buffers = {
        vertex: marchVertBuffer,
        normal: marchNormalBuffer,
        index: marchIndexBuffer
    }
    
    
    // if (!bufferId) {
    //     createMarchReadBuffers(vertNum, indNum);
    // };

    var commandEncoder = device.createCommandEncoder();
    //device.queue.writeBuffer(marchVarsBuffer, 0, new Float32Array([threshold, 0, 0]));

    await commandEncoder;
    var passEncoder6 = commandEncoder.beginComputePass();
    
    passEncoder6.setPipeline(dataObj.marchData.pipelines.march);
    passEncoder6.setBindGroup(0, dataObj.marchData.bindGroups.constants);
    passEncoder6.setBindGroup(1, marchData.bindGroups.marchVars);
    passEncoder6.setBindGroup(2, marchOutBindGroup);
    passEncoder6.setBindGroup(3, dataObj.marchData.bindGroups.combinedOffset);
    passEncoder6.dispatchWorkgroups(
        Math.ceil(dataObj.size[0]/WGSize.x),
        Math.ceil(dataObj.size[1]/WGSize.y),
        Math.ceil(dataObj.size[2]/WGSize.z)
    );

    passEncoder6.end();

    //commandEncoder.copyBufferToBuffer(marchIndexBuffer, 0, readBuffer, 0, 7776*4);

    // if (!bufferId) {
    //     commandEncoder.copyBufferToBuffer(marchVertBuffer, 0, marchVertReadBuffer, 0, vertNum * 3 * 4);
    //     commandEncoder.copyBufferToBuffer(marchNormalBuffer, 0, marchNormalReadBuffer, 0, vertNum * 3 * 4);
    //     commandEncoder.copyBufferToBuffer(marchIndexBuffer, 0, marchIndexReadBuffer, 0, indNum * 4);
    // };

    device.queue.submit([commandEncoder.finish()]);

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

    
    // if(!bufferId) {
        
    //     await marchVertReadBuffer.mapAsync(GPUMapMode.READ);
    //     meshObj.verts = new Float32Array(marchVertReadBuffer.getMappedRange()).slice(0);
    //     marchVertReadBuffer.unmap();

    //     await marchNormalReadBuffer.mapAsync(GPUMapMode.READ)
    //     meshObj.normals = new Float32Array(marchNormalReadBuffer.getMappedRange()).slice(0);
    //     marchNormalReadBuffer.unmap();

    //     await marchIndexReadBuffer.mapAsync(GPUMapMode.READ)
    //     meshObj.indices = new Uint32Array(marchIndexReadBuffer.getMappedRange()).slice(0);
    //     marchIndexReadBuffer.unmap();
    // } else {
    //     destroyBuffer(buffers[bufferId].vertex.buffer);
    //     buffers[bufferId].vertex.buffer = marchVertBuffer;
    //     destroyBuffer(buffers[bufferId].normal.buffer);
    //     buffers[bufferId].normal.buffer = marchNormalBuffer;
    //     destroyBuffer(buffers[bufferId].index.buffer);
    //     buffers[bufferId].index.buffer = marchIndexBuffer;
    // }

    // delete all the temporary buffers
    

    // if (!bufferId) {
    //     destroyBuffer(marchVertBuffer);
    //     destroyBuffer(marchNormalBuffer);
    //     destroyBuffer(marchIndexBuffer);    
    //     destroyBuffer(marchVertReadBuffer);
    //     destroyBuffer(marchNormalReadBuffer);
    //     destroyBuffer(marchIndexReadBuffer);
    // };
    
    //console.log("took: " + Math.round(performance.now()-t0) + "ms");
}

// run when the fine data is changed before marching through it
// deals with loading the data onto the gpu, creating buffers and bindgroups
// and cleaning up the previous buffers if they exist
function setupmarchFine(dataObj) {
    // destroy buffers if they already exist
    dataObj.marchData.buffers.activeBlocks?.destroy();
    dataObj.marchData.buffers.dataFine?.destroy();
    dataObj.marchData.buffers.blockLocations?.destroy();
    dataObj.marchData.buffers.vertexOffsetFine?.destroy();
    dataObj.marchData.buffers.indexOffsetFine?.destroy();

    const packing = dataObj.marchData.packing;
    const WGCount = dataObj.marchData.WGCount;
    // create data buffer
    {
        var dataBuffer = device.createBuffer({
            size: 32 + Math.ceil((dataObj.fineData.length * 4/packing)/4)*4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        }); 

        var range = dataBuffer.getMappedRange();

        var nextPtr = 0;
        nextPtr += 16;

        console.log(dataObj.blocksSize)
        new Uint32Array(range, nextPtr, 3).set(dataObj.blocksSize);
        nextPtr += 16;

        const data = dataObj.fineData;

        if (packing == 1) {
            new Float32Array(range, nextPtr, data.length).set(data);
        } else if(packing == 4) {
            if (data.constructor == Float32Array) {
                new Uint8Array(range, nextPtr, data.length).set(Uint8Array.from(data, (val) => {
                    return 255*(val-dataObj.limits[0])/(dataObj.limits[1]-dataObj.limits[0])
                }));
            } else if (data.constructor == Uint8Array) {
                console.log("uint8")
                new Uint8Array(range, nextPtr, data.length).set(data);
            }
        }

        dataBuffer.unmap();

        var activeBlocksBuffer = device.createBuffer({
            size: 4*Math.ceil(dataObj.activeBlocks.length/4)*4,
            usage: GPUBufferUsage.STORAGE,
            mappedAtCreation: true
        }); 

        new Uint32Array(activeBlocksBuffer.getMappedRange(), 0, dataObj.activeBlocks.length).set(dataObj.activeBlocks);
        activeBlocksBuffer.unmap();

        // create and set the locations buffer too
        var blockLocationsBuffer = device.createBuffer({
            size: 4*Math.ceil(dataObj.blockLocations.length/4)*4,
            usage: GPUBufferUsage.STORAGE,
            mappedAtCreation: true
        }); 

        new Int32Array(blockLocationsBuffer.getMappedRange(), 0, dataObj.blockLocations.length).set(dataObj.blockLocations);
        blockLocationsBuffer.unmap();

        dataObj.marchData.buffers.dataFine = dataBuffer;
        dataObj.marchData.buffers.activeBlocks = activeBlocksBuffer;
        dataObj.marchData.buffers.blockLocations = blockLocationsBuffer;


        dataObj.marchData.bindGroups.dataFine = device.createBindGroup({
            layout: dataObj.marchData.pipelines.enumerateFine.getBindGroupLayout(1),
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
                        buffer: activeBlocksBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: blockLocationsBuffer
                    }
                }
            ]
        });
    };

    // create offset buffers
    {
        const offsetBufferLength = Math.ceil(dataObj.activeBlocks.length/(WGPrefixSumCount*2)) * WGPrefixSumCount*2;
        
        var vertexOffsetBuffer = device.createBuffer({
            size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        
        var indexOffsetBuffer = device.createBuffer({
            size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
    
        dataObj.marchData.buffers.vertexOffsetFine = vertexOffsetBuffer;
        dataObj.marchData.buffers.indexOffsetFine = indexOffsetBuffer;        
    
        dataObj.marchData.bindGroups.vertexOffsetFine = device.createBindGroup({
            layout: marchData.pipelines.prefix[0].getBindGroupLayout(0),
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
                        buffer: marchData.buffers.vertexOffsetTotals
                    }
                }
            ]
        });
    
        dataObj.marchData.bindGroups.indexOffsetFine = device.createBindGroup({
            layout: marchData.pipelines.prefix[0].getBindGroupLayout(0),
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
                        buffer: marchData.buffers.indexOffsetTotals
                    }
                }
            ]
        });
    
        // combined offset buffers into one bg
        dataObj.marchData.bindGroups.combinedOffsetFine = device.createBindGroup({
            layout: dataObj.marchData.pipelines.enumerateFine.getBindGroupLayout(2),
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

async function marchFine(dataObj, meshObj, threshold) {
    if (dataObj.fineData.length == 0) return;
    console.log(dataObj.activeBlocks.length)   

    // setup for loading the data onto the gpu =====================================
    // also creates BGs
    setupmarchFine(dataObj);
    // =============================================================================

    // write threshold 
    device.queue.writeBuffer(dataObj.marchData.buffers.dataFine, 0, new Float32Array([transformThreshold(threshold, dataObj)]));

    const maxWG = device.limits.maxComputeWorkgroupsPerDimension;
    var totalBlocks = dataObj.activeBlocks.length;
    var thisNumBlocks;
    var blockOffset = 0;

    for (let i = 0; i < Math.ceil(totalBlocks/maxWG); i++) {
        var commandEncoder = await device.createCommandEncoder();
        device.queue.writeBuffer(dataObj.marchData.buffers.dataFine, 4, new Uint32Array([blockOffset]));
        thisNumBlocks =  Math.min(maxWG, totalBlocks-blockOffset);

        var passEncoder = commandEncoder.beginComputePass();
    
        passEncoder.setPipeline(dataObj.marchData.pipelines.enumerateFine);
        passEncoder.setBindGroup(0, marchData.bindGroups.tables);
        passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.dataFine);
        passEncoder.setBindGroup(2, dataObj.marchData.bindGroups.combinedOffsetFine);
        passEncoder.dispatchWorkgroups(thisNumBlocks);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()])  

        blockOffset += thisNumBlocks;
    }

    // prefix sum pass ===================================================================
    const offsetTotalsBufferLength = 2 + WGPrefixSumCount*2;
    device.queue.writeBuffer(marchData.buffers.vertexOffsetTotals, 0, new Uint32Array(offsetTotalsBufferLength));
    device.queue.writeBuffer(marchData.buffers.indexOffsetTotals, 0, new Uint32Array(offsetTotalsBufferLength));
    
    // prefix sum on verts
    // starts as total number of values in totals
    const numBlocks = Math.ceil(dataObj.activeBlocks.length/(WGPrefixSumCount*2));
    var thisNumBlocks
    var OffsetIntoOffsetBuffer = 0;
    
    const elems = 32;
    const totalsClearArray = new Uint32Array(WGPrefixSumCount*2);

    //                  number of rounds to do
    for (let i = 0; i < numBlocks/(WGPrefixSumCount*2); i++) {
        //console.log("round " + i)
        device.queue.writeBuffer(marchData.buffers.bufferOffset, 0, Uint32Array.from([OffsetIntoOffsetBuffer]));
        if (i > 0) {
            device.queue.writeBuffer(marchData.buffers.vertexOffsetTotals, 2*4, totalsClearArray);
            device.queue.writeBuffer(marchData.buffers.indexOffsetTotals, 2*4, totalsClearArray);
        }
        
        thisNumBlocks = Math.max(2, Math.min(WGPrefixSumCount*2, numBlocks-OffsetIntoOffsetBuffer));
        
        //console.log(thisNumBlocks);
        
        //console.log("numblock: " + numBlocks)
        commandEncoder = await device.createCommandEncoder();
        
        
        
        // prefix sum on verts
        var passEncoder2 = commandEncoder.beginComputePass();
        passEncoder2.setPipeline(marchData.pipelines.prefix[0]);
        passEncoder2.setBindGroup(0, dataObj.marchData.bindGroups.vertexOffsetFine);
        passEncoder2.setBindGroup(1, marchData.bindGroups.bufferOffset);
        passEncoder2.dispatchWorkgroups(thisNumBlocks);
        passEncoder2.end();

        // prefix sum on indices
        var passEncoder3 = commandEncoder.beginComputePass();
        passEncoder3.setPipeline(marchData.pipelines.prefix[0]);
        passEncoder3.setBindGroup(0, dataObj.marchData.bindGroups.indexOffsetFine);
        passEncoder3.setBindGroup(1, marchData.bindGroups.bufferOffset);

        passEncoder3.dispatchWorkgroups(thisNumBlocks);
        passEncoder3.end();
        
        if (numBlocks > 0) {
            var passEncoder4 = commandEncoder.beginComputePass();
            passEncoder4.setPipeline(marchData.pipelines.prefix[1]);
            passEncoder4.setBindGroup(0, dataObj.marchData.bindGroups.vertexOffsetFine);
            passEncoder4.setBindGroup(1, marchData.bindGroups.bufferOffset);

            passEncoder4.dispatchWorkgroups(1);
            passEncoder4.end();
            // for indices
            var passEncoder5 = commandEncoder.beginComputePass();
            passEncoder5.setPipeline(marchData.pipelines.prefix[1]);
            passEncoder5.setBindGroup(0, dataObj.marchData.bindGroups.indexOffsetFine);
            passEncoder5.setBindGroup(1, marchData.bindGroups.bufferOffset);

            passEncoder5.dispatchWorkgroups(1);
            passEncoder5.end();
        }

        await device.queue.onSubmittedWorkDone();
        device.queue.submit([commandEncoder.finish()]);

        OffsetIntoOffsetBuffer += thisNumBlocks;
    }
    // copy values into correct buffers
    commandEncoder = await device.createCommandEncoder();

    commandEncoder.copyBufferToBuffer(marchData.buffers.vertexOffsetTotals, 4, marchData.buffers.countReadBuffer, 0, 4);
    commandEncoder.copyBufferToBuffer(marchData.buffers.indexOffsetTotals, 4, marchData.buffers.countReadBuffer, 4, 4);

    device.queue.submit([commandEncoder.finish()]);
    
    //device.queue.submit(prefixSumCommands);
    
    await marchData.buffers.countReadBuffer.mapAsync(GPUMapMode.READ, 0, 8) 
    const lengths = new Uint32Array(marchData.buffers.countReadBuffer.getMappedRange());
    var vertNum = lengths[0];
    var indNum = lengths[1];
    //console.log("fine verts + inds:", vertNum, indNum);  
    marchData.buffers.countReadBuffer.unmap();


    // march pass =====================================================================================
    meshObj.indicesNum = indNum;
    meshObj.vertNum = vertNum;

    if (vertNum == 0 || indNum == 0) {
        meshObj.verts = new Float32Array();
        meshObj.normals = new Float32Array();
        meshObj.indices = new Float32Array();
        console.log("yo, no verts")
        return;
    }
    deleteBuffers(meshObj);
    var marchOutBindGroup = createMarchFineOutputBindGroup(vertNum, indNum, dataObj);
    
    // set the buffers in the mesh
    meshObj.buffers = {
        vertex: marchVertBuffer,
        // normals will be all 0 vectors
        normal: marchNormalBuffer,
        index: marchIndexBuffer
    }

    totalBlocks = dataObj.activeBlocks.length;
    blockOffset = 0;

    for (let i = 0; i < Math.ceil(totalBlocks/maxWG); i++) {
        var commandEncoder = await device.createCommandEncoder();
        device.queue.writeBuffer(dataObj.marchData.buffers.dataFine, 4, new Uint32Array([blockOffset]));
        thisNumBlocks =  Math.min(maxWG, totalBlocks-blockOffset);

        var commandEncoder = await device.createCommandEncoder();

        var passEncoder6 = commandEncoder.beginComputePass();
        
        passEncoder6.setPipeline(dataObj.marchData.pipelines.marchFine);
        passEncoder6.setBindGroup(0, marchData.bindGroups.tables);
        passEncoder6.setBindGroup(1, dataObj.marchData.bindGroups.dataFine);
        passEncoder6.setBindGroup(2, marchOutBindGroup);
        passEncoder6.setBindGroup(3, dataObj.marchData.bindGroups.combinedOffsetFine);
        passEncoder6.dispatchWorkgroups(thisNumBlocks);
        passEncoder6.end();

        commandEncoder.copyBufferToBuffer(marchVertBuffer, 0, marchData.buffers.read, 0, 10*4);

        device.queue.submit([commandEncoder.finish()]);
        blockOffset += thisNumBlocks;
    }


    // marchData.buffers.read.mapAsync(GPUMapMode.READ, 0, 10*4).then(() => {
    //     console.log(new Float32Array(marchData.buffers.read.getMappedRange(0, 10*4)));
    //     marchData.buffers.read.unmap();
    // });


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

// rendering functions ==========================================================================================

async function setupRenderer(canvas) {
    if (!device) {
        await setupWebGPU();
    }
    
    var ctx = canvas.getContext("webgpu");

    // setup swapchain
    ctx.configure({
        device: device,
        format: 'bgra8unorm'
    });

    // TODO: seperate pipeline for rendering views and copying to main texture

    shaderCode = await shaderCode;
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
    deleteBuffers(mesh);

    mesh.buffers.vertex = createFilledBuffer("f32", mesh.verts, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);

    mesh.buffers.normal = createFilledBuffer("f32", mesh.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);

    mesh.buffers.index = createFilledBuffer("u32", mesh.indices, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
}

function destroyBuffer(buffer) {
    if (buffer !== null) {
        buffer?.destroy();
    }
}

function deleteBuffers(meshObj) {
    meshObj.buffers?.vertex?.destroy();
    meshObj.buffers?.normal?.destroy();
    meshObj.buffers?.index?.destroy();
    //delete buffers[id];
};

function clearScreen() {};

async function renderView(ctx, projMat, modelViewMat, box, meshObj) {
    if (meshObj.indicesNum == 0) return;
    

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
            clearValue: clearColor,
            loadOp: "clear",
            storeOp: "store",
            view: ctx.getCurrentTexture().createView()
        }],
        depthStencilAttachment: {
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: 'discard',
            // stencilClearValue: 0,
            // stencilLoadOp: "clear",
            // stencilStoreOp: 'store',
            view: depthStencilTexture.createView()
          }
    };

    // write uniforms to buffer
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([...projMat, ...modelViewMat]))

    await commandEncoder;
    
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    // for now, only draw a view if it is fully inside the canvas
    if (box.right >= 0 && box.bottom >= 0 && box.left >= 0 && box.top >= 0) {
        // will support rect outside the attachment size for V1 of webgpu
        // https://github.com/gpuweb/gpuweb/issues/373 
        passEncoder.setViewport(box.left, box.top, box.width, box.height, 0, 1);
        // clamp to be inside the canvas
        clampBox(box, ctx.canvas.getBoundingClientRect());
        passEncoder.setScissorRect(box.left, box.top, box.width, box.height);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setIndexBuffer(meshObj.buffers.index, "uint32");
        passEncoder.setVertexBuffer(0, meshObj.buffers.vertex);
        passEncoder.setVertexBuffer(1, meshObj.buffers.normal);
        // passEncoder.setIndexBuffer(buffers[id].index.buffer, "uint32");
        // passEncoder.setVertexBuffer(0, buffers[id].vertex.buffer);
        // passEncoder.setVertexBuffer(1, buffers[id].normal.buffer);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.drawIndexed(meshObj.indicesNum);
    }
    
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    depthStencilTexture.destroy();
}

async function renderFrame() {
    var commandEncoder = device.createCommandEncoder();
    var canvasTexture = ctx.getCurrentTexture();
    const renderPassDescriptor = {
        colorAttachments: [{
            clearValue: clearColor,
            loadOp: "clear",
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
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    // create a textureview for the whole canvas
    // access the framebuffers for each view
    // for (view in views) {
    // device.
    // copy each to the canvas in the correct place
}

function resizeRenderingContext(ctx) {
    ctx.configure({
        device: device,
        format: 'bgra8unorm'
    });
}


/*
function posFromIndex(i, size) {
    return {
        x: Math.floor(i/(size.y*size.z)), 
        y: Math.floor(i/size.z)%size.y, 
        z: i%size.z
    };
}

function getIndex(pos, size) {
    return pos.x*size.y*size.z + pos.y*size.z + pos.z;
}

// const size = {
//     x: 8,
//     y: 9,
//     z: 13
// }

// for (let i = 0; i < 100; i++) {
//     const pos = {
//         x: Math.floor(Math.random()*size.x),
//         y: Math.floor(Math.random()*size.y),
//         z: Math.floor(Math.random()*size.z)
//     }
//     const index = getIndex(pos, size);
//     const pos2 = posFromIndex(index, size);
//     if (pos.x != pos2.x || pos.y != pos2.y || pos.z != pos2.z) {
//         console.log(pos, pos2, index)
//         console.log("incorrect mapping")
//     }
// }
*/

