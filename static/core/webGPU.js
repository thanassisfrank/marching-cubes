// webgpu.js
// handles the webgpu api
// generating mesh and rendering

import { stringFormat, clampBox } from "./utils.js";

export {
    waitForDone,

    setupMarchModule, 
    setupMarch, 
    setupMarchFine,
    march, 
    updateActiveBlocks,
    updateMarchFineData,
    marchFine, 
    cleanupMarchData,

    setupRenderer, 
    createBuffers, 
    updateBuffers, 
    renderView, 
    renderMesh,
    deleteBuffers, 
    clearScreen, 
    resizeRenderingContext
};


const WGSize = {
    x: 4,
    y: 4,
    z: 4
}

const WGPrefixSumCount = 256;
const WGTransformVertsCount = 256;
const MaxWGSize = 256;
const MaxFineDataDimension = WGSize.x*128;
const MaxFineBlocksCount = Math.pow(MaxFineDataDimension/WGSize.x, 3);

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
     2,  4,  6, -1, -1, -1, -1, // z+ edge neighbour
     1,  2,  3,  4,  5,  6,  7  // corner neighbour 
]

const tablesLength = vertCoordTable.length + edgeTable.length + edgeToVertsTable.length + triTable.length + neighbourCellsTable.length;

// shader programs ################################################################################################
function fetchShader(name) {
    return fetch("core/shaders/" + name + ".wgsl").then(response => response.text());
}

var shaderCode = fetchShader("shader");

var enumerateCode = fetchShader("enumerate");
var enumerateFineCode = fetchShader("enumerateFine");

// general prefix sum applied to the buffer in group(0) binding(0)
var prefixSumACode = fetchShader("prefixSumA");
var prefixSumBCode = fetchShader("prefixSumB");

var marchCode = fetchShader("march");
var marchFineCode = fetchShader("marchFine");

var updateFineDataCode = fetchShader("updateFineData");

var transformVertsCode = fetchShader("transformVerts");

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
    maxStorageBufferBindingSize = device.limits.maxStorageBufferBindingSize;
}

export var maxStorageBufferBindingSize;

// generates a BGLayout from the input string
// " " separates bindings
// stages/visibility:
// c   compute
// v   vertex
// f   fragment
// binding types:
// b   buffer
// s   sampler
// t   texture
// in order [stage][binding type][binding info...]

function generateBGLayout(desc, label = "") {
    const entriesStr = desc.split(" ");
    var entries = [];
    for (let i = 0; i < entriesStr.length; i++) {
        var entry = {binding: i}

        entry.visibility = {
            c: GPUShaderStage.COMPUTE,
            v: GPUShaderStage.VERTEX,
            f: GPUShaderStage.FRAGMENT
        }[entriesStr[i][0]];

        switch (entriesStr[i][1]) {
            case "b":
                entry.buffer = {};
                entry.buffer.type = {
                    s: "storage",
                    r: "read-only-storage",
                    u: "uniform"
                }[entriesStr[i][2]];
                break;
            case "s":
                entry.sampler = {};
                entry.sampler.type = {
                    f: "filtering",
                    n: "non-filtering",
                    c: "comparison"
                }[entriesStr[i][2]];
                break;
            case "t":
                entry.texture = {};
                entry.texture.sampleType = {
                    f: "float",
                    n: "unfilterable-float",
                    d: "depth",
                    s: "sint",
                    u: "uint"
                }[entriesStr[i][2]];
                entry.texture.viewDimension = {
                    "1d": "1d",
                    "2d": "2d",
                    "2a": "2d-array",
                    "cu": "cube",
                    "ca": "cube-array",
                    "3d": "3d"
                }[entriesStr[i].slice(3, 3+2)];
                entry.texture.multiSampled = {
                    "t": true,
                    "f": false
                }[entriesStr[i][5]];
                break;
            case "w":
                entry.storageTexture = {
                    access: "write-only"
                };
                entry.storageTexture.viewDimension = {
                    "1d": "1d",
                    "2d": "2d",
                    "2a": "2d-array",
                    "cu": "cube",
                    "ca": "cube-array",
                    "3d": "3d"
                }[entriesStr[i].slice(2, 2+2)];
                entry.storageTexture.format = entriesStr[i].slice(4);
                break;
        }

        entries.push(entry);
    }
    return device.createBindGroupLayout({label: label, entries: entries});
}

function generateBG(layout, resources, label = "") {
    var entries = [];
    for (let i = 0; i < resources.length; i++) {
        if (resources[i].constructor == GPUBuffer) {
            entries.push({
                binding: i,
                resource: {
                    buffer: resources[i]
                }
            })
        } else {
            entries.push({
                binding: i,
                resource: resources[i]
            })
        }
    }
    return device.createBindGroup({
        layout: layout,
        label: label,
        entries: entries
    })
}

function generateComputePipeline(codeStr, formatObj, bgLayouts) {
    const codeFormatted = stringFormat(codeStr, formatObj)
    var module = device.createShaderModule({
        code: codeFormatted
    });

    var pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: bgLayouts
    });

    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: module,
            entryPoint: "main"
        }
    });
}

// generates a buffer with the information and returns it
function makeBuffer(size, usage, label = "", mappedAtCreation = false) {
    var usageInt = 0;
    const usageDict = {
        "mr": GPUBufferUsage.MAP_READ,
        "mw": GPUBufferUsage.MAP_WRITE,
        "cs": GPUBufferUsage.COPY_SRC,
        "cd": GPUBufferUsage.COPY_DST,
        "i": GPUBufferUsage.INDEX,
        "v": GPUBufferUsage.VERTEX,
        "u": GPUBufferUsage.UNIFORM,
        "s": GPUBufferUsage.STORAGE,
        "id": GPUBufferUsage.INDIRECT,
        "qr": GPUBufferUsage.QUERY_RESOLVE
    }
    for (let usageStr of usage.split(" ")) {
        usageInt |= usageDict[usageStr];
    }
    return device.createBuffer({
        label: label,
        size: size,
        usage: usageInt,
        mappedAtCreation: mappedAtCreation
    });
}

async function getBufferContents(buffer) {

}

const clearColor = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

// webgpu objects #################################################################################################
var adapter;
var device;

var meshRenderPipeline;
var pointsRenderPipeline;

var currentDepthStencilTexture; 

// specific buffers for each mesh loaded
var buffers = {};
// contains matrices for rendering
var uniformBuffer;

var marchVertReadBuffer;
var marchNormalReadBuffer;
var marchIndexReadBuffer;

var meshBindGroup;
var pointsBindGroup

// holds all the global data, common to all marching operations
var marchData = {
    buffers: {},
    bindGroups: {},
    bindGroupLayouts: {},
    // holds prefix sum and transform verts pipelines
    pipelines: {}
}

async function setupMarchModule() {
    if (!device) {
        await setupWebGPU();
    }

    marchData.buffers.readBuffer = device.createBuffer({
        label: "read buffer",
        size: 7776 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    createGlobalBuffers();
    createBindGroupLayouts();
    createGlobalBindGroups();

    prefixSumACode = await prefixSumACode;
    prefixSumBCode = await prefixSumBCode;
    updateFineDataCode = await updateFineDataCode;

    const formatObj = {
        "WGPrefixSumCount": WGPrefixSumCount,
        "MaxWGSize": MaxWGSize,
        "WGVol": WGSize.x * WGSize.y * WGSize.z
    }

    marchData.pipelines.prefix = [
        generateComputePipeline(prefixSumACode, formatObj, marchData.bindGroupLayouts.prefix),
        generateComputePipeline(prefixSumBCode, formatObj, marchData.bindGroupLayouts.prefix),
    ]
}

async function waitForDone() {
    await device.queue.onSubmittedWorkDone();
    return;
}

function createGlobalBuffers() {
    // set the various tables needed
    // this global table buffer will be copied for each data object

    const tablesSize = tablesLength * Uint32Array.BYTES_PER_ELEMENT
    marchData.buffers.tables = makeBuffer(tablesSize, "s cd cs", "global tables", true)

    console.log("tables length:", tablesLength);

    var range = marchData.buffers.tables.getMappedRange();
    var currOff = 0;
    for (let t of [vertCoordTable, edgeTable, edgeToVertsTable, triTable, neighbourCellsTable]) { 
        new Int32Array(range, currOff*4, t.length).set(t);
        currOff += t.length;
    };

    marchData.buffers.tables.unmap();    
    
    marchData.buffers.read = device.createBuffer({
        label: "global read buffer 2",
        size: 64 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // marchData.buffers.read = makeBuffer(64 * Uint32Array.BYTES_PER_ELEMENT);

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
}

function createBindGroupLayouts() {
    marchData.bindGroupLayouts.enumerate = [
        generateBGLayout("cbr ctn3df cbr", "enum0"),
        generateBGLayout("cbs", "enum1"),
        generateBGLayout("cbs cbs", "enum2"),
        generateBGLayout("cbs cbs", "enum3")
    ];

    marchData.bindGroupLayouts.enumerateFine = [
        generateBGLayout("cbr"),
        generateBGLayout("cbr ctn3df cbr cbr"),
        generateBGLayout("cbs cbs")
    ];

    marchData.bindGroupLayouts.prefix = [
        generateBGLayout("cbs cbs", "pref0"),
        generateBGLayout("cbr", "pref1")
    ];

    marchData.bindGroupLayouts.march = [
        generateBGLayout("cbr ctn3df cbr", "march0"),
        generateBGLayout("cbs", "march1"),
        generateBGLayout("cw3dr32float cw3dr32float cw3dr32uint", "march2"),
        generateBGLayout("cbs cbs", "march3")
    ];

    marchData.bindGroupLayouts.marchFine = [
        generateBGLayout("cbr"),
        generateBGLayout("cbr ctn3df cbr cbr"),
        generateBGLayout("cw3dr32float cw3dr32float cw3dr32uint", "march2"),
        generateBGLayout("cbs cbs")
    ];

    marchData.bindGroupLayouts.updateFineData = [
        generateBGLayout("cw3dr32float ctn3df cbr cbr cbr", "update fine data bg 0"),
        generateBGLayout("cbs cbr cbs", "update fine data bg 1")
    ]

    marchData.bindGroupLayouts.updateFineDataSG = [
        generateBGLayout("cw3drgba32float ctn3df cbr cbr cbr", "update fine data bg 0"),
        generateBGLayout("cbs cbr cbs", "update fine data bg 1")
    ]

    marchData.bindGroupLayouts.transformVerts = [
        generateBGLayout("cbr cbr"),
        generateBGLayout("cbs cbs cbs"),
    ];
}

function getWGCount(dataObj) {
    const cellScale = dataObj.marchData.cellScale;
    var WGCount = {
        x: Math.ceil((dataObj.size[0]-1)/(WGSize.x * cellScale)),
        y: Math.ceil((dataObj.size[1]-1)/(WGSize.y * cellScale)),
        z: Math.ceil((dataObj.size[2]-1)/(WGSize.z * cellScale))
    }
    // console.log(WGCount, dataObj.size);
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
    // if (dataObj.data.constructor == Float32Array) {
    //     dataObj.marchData.packing = 1;
    // } else if (dataObj.data.constructor == Uint8Array) {
    //     dataObj.marchData.packing = 4;
    // } else {
    //     console.log("only float32 and uint8 data values supported so far");
    //     return;
    // }

    getWGCount(dataObj);

    dataObj.marchData.buffers = {};
    dataObj.marchData.pipelines = {};
    dataObj.marchData.textures = {};
    dataObj.marchData.samplers = {};

    const formatObj = {
        "packing": dataObj.marchData.packing,
        "WGSizeX": WGSize.x,
        "WGSizeY": WGSize.y,
        "WGSizeZ": WGSize.z,
        "WGVol": WGSize.x * WGSize.y * WGSize.z
    }
    
    enumerateCode = await enumerateCode;
    marchCode = await marchCode;
    
    dataObj.marchData.pipelines.enumerate = generateComputePipeline(enumerateCode, formatObj, marchData.bindGroupLayouts.enumerate);
    dataObj.marchData.pipelines.march = generateComputePipeline(marchCode, formatObj, marchData.bindGroupLayouts.march);
    
    createBindGroups(dataObj);   

    console.log("setup complete");
    
}

async function setupMarchFine(dataObj) {
    console.log("setting up complex dataset")
    dataObj.marchData = {
        textures:{},
        buffers:{},
        bindGroups:{}
    }

    dataObj.marchData.cellScale = 1;
      
    dataObj.marchData.packing = 1;
    // if (dataObj.dataType == Float32Array) {
    //     dataObj.marchData.packing = 1;
    // } else if (dataObj.dataType == Uint8Array) {
    //     dataObj.marchData.packing = 4;
    // } else {
    //     console.log("only float32 and uint8 data values supported so far");
    //     return;
    // }

    // get the size of the fine data buffer in #blocks
    dataObj.marchData.fineBlocksCount = Math.min(dataObj.blocksVol, MaxFineBlocksCount);

    enumerateFineCode = await enumerateFineCode;
    marchFineCode = await marchFineCode;

    var formatObj = {
        "packing": dataObj.marchData.packing,
        "WGSizeX": WGSize.x,
        "WGSizeY": WGSize.y,
        "WGSizeZ": WGSize.z,
        "WGVol": WGSize.x * WGSize.y * WGSize.z,
        "MaxWGSize": MaxWGSize,
        "StorageTexFormat": "r32float"
    }
    var updateLayout = marchData.bindGroupLayouts.updateFineData;
    if (dataObj.structuredGrid) {
        formatObj.StorageTexFormat = "rgba32float";
        updateLayout = marchData.bindGroupLayouts.updateFineDataSG;
    }

    // create the pipelines
    dataObj.marchData.pipelines = {
        enumerateFine: generateComputePipeline(enumerateFineCode, formatObj, marchData.bindGroupLayouts.enumerateFine),
        marchFine: generateComputePipeline(marchFineCode, formatObj, marchData.bindGroupLayouts.marchFine),
        updateFineData: generateComputePipeline(updateFineDataCode, formatObj, updateLayout)
    }
    console.log("added")

    const offsetTotalsBufferLength = 2 + WGPrefixSumCount*2;

    var fineCountReadBuffer = device.createBuffer({
        label: dataObj.id + ": fine count read buffer",
        size: 2 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    var vertexOffsetTotalsBuffer = device.createBuffer({
        label: dataObj.id + ": vert off totals buffer",
        size: offsetTotalsBufferLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    var indexOffsetTotalsBuffer = device.createBuffer({
        label: dataObj.id + ": ind off totals buffer",
        size: offsetTotalsBufferLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    var bufferOffsetBuffer = device.createBuffer({
        label: dataObj.id + ": buffer offset buffer",
        size: 1 * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    
    dataObj.marchData.buffers.fineCountReadBuffer = fineCountReadBuffer;
    dataObj.marchData.buffers.vertexOffsetTotals = vertexOffsetTotalsBuffer;
    dataObj.marchData.buffers.indexOffsetTotals = indexOffsetTotalsBuffer;
    dataObj.marchData.buffers.bufferOffset = bufferOffsetBuffer;

    dataObj.marchData.bindGroups.bufferOffset = generateBG(
        marchData.bindGroupLayouts.prefix[1],
        [dataObj.marchData.buffers.bufferOffset],
        "buffer offset fine"

    );

    // create the fine data texture
    const textureSize = {};
    if (dataObj.blockVol < MaxFineBlocksCount) {
        textureSize.width = dataObj.blocksSize[2] * WGSize.z;
        textureSize.height = dataObj.blocksSize[1] * WGSize.y;
        textureSize.depthOrArrayLayers = dataObj.blocksSize[0] * WGSize.x;
    } else {
        textureSize.width = MaxFineDataDimension;
        textureSize.height = MaxFineDataDimension;
        textureSize.depthOrArrayLayers = MaxFineDataDimension;
    }
    var format = "r32float";
    if (dataObj.structuredGrid) format = "rgba32float";


    dataObj.marchData.textures.dataFine = device.createTexture({
        label: "whole data texture",
        size: textureSize,
        dimension: "3d",
        format: format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
    })

    // create the block locations buffer
    dataObj.marchData.buffers.blockLocations = device.createBuffer({
        label: dataObj.id + ": block locations",
        size: dataObj.marchData.fineBlocksCount * 4,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true
    });

    var range = dataObj.marchData.buffers.blockLocations.getMappedRange();
    new Int32Array(range, 0, dataObj.marchData.fineBlocksCount).fill(-1);
    dataObj.marchData.buffers.blockLocations.unmap();

    // create locations occupied buffer
    // Assume all initially at 0
    dataObj.marchData.buffers.locationsOccupied = device.createBuffer({
        label: dataObj.id + ": locations occupied buffer",
        size: dataObj.marchData.fineBlocksCount * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    console.log(dataObj.marchData.fineBlocksCount * 4);

    dataObj.marchData.buffers.dataInfoFine = device.createBuffer({
        label: dataObj.id + ": fine data info buffer",
        size: 52,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true
    }); 

    range = dataObj.marchData.buffers.dataInfoFine.getMappedRange();

    new Uint32Array(range, 16, 3).set(dataObj.blocksSize);
    new Uint32Array(range, 32, 3).set(dataObj.fullSize);
    if (dataObj.structuredGrid) new Uint32Array(range, 48, 1).set([1]);
    
    dataObj.marchData.buffers.dataInfoFine.unmap();

    dataObj.marchData.setupComplete = true;

}

function createBindGroups(dataObj) {
    dataObj.marchData.bindGroups = {};
    dataObj.marchData.buffers = {};
    // set the data and its dimensions
    const packing = dataObj.marchData.packing;
    const WGCount = dataObj.marchData.WGCount;

    
    dataObj.marchData.buffers.dataInfo = device.createBuffer({
        label: dataObj.id + ": data info buffer",
        size: 16 + 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    
    var range = dataObj.marchData.buffers.dataInfo.getMappedRange();

    new Float32Array(range, 0, 3).set(dataObj.cellSize);
    if (dataObj.structuredGrid) {
        new Uint32Array(range, 16, 1).set([1]);
    } else {
        new Uint32Array(range, 16, 1).set([0]);
    }
    console.log(new Uint32Array(range));
    dataObj.marchData.buffers.dataInfo.unmap();

    // data texture version
    {   
        const textureSize = {
            width: dataObj.size[2],
            height: dataObj.size[1],
            depthOrArrayLayers: dataObj.size[0]
        }
        console.log(textureSize, dataObj.data.length);
        
        // transfer data over
        // create the buffer to copy from
        if (dataObj.structuredGrid) {
            // if structured grid, combine data and points into one buffer
            // texel: (val, x pos, y pos, z pos)
            var dataBuffer = new Float32Array(dataObj.data.length * 4);
            for (let i = 0; i < dataObj.data.length; i++) {
                dataBuffer[4*i + 0] = dataObj.data[i];
                dataBuffer[4*i + 1] = dataObj.points[3*i + 0];
                dataBuffer[4*i + 2] = dataObj.points[3*i + 1];
                dataBuffer[4*i + 3] = dataObj.points[3*i + 2];
            }

            dataObj.marchData.textures.data = device.createTexture({
                label: "whole data texture",
                size: textureSize,
                dimension: "3d",
                format: "rgba32float",
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            })
            // console.log(dataObj.marchData.textures.data)
            // console.log()
            device.queue.writeTexture(
                {
                    texture: dataObj.marchData.textures.data
                },
                dataBuffer,
                {
                    offset: 0,
                    bytesPerRow: textureSize.width * 4 * 4,
                    rowsPerImage: textureSize.height
                },
                textureSize
            )
        } else {
            dataObj.marchData.textures.data = device.createTexture({
                label: "whole data texture",
                size: textureSize,
                dimension: "3d",
                format: "r32float",
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            })

            device.queue.writeTexture(
                {
                    texture: dataObj.marchData.textures.data
                },
                Float32Array.from(dataObj.data),
                {
                    offset: 0,
                    bytesPerRow: textureSize.width * 4,
                    rowsPerImage: textureSize.height
                },
                textureSize
            )
        }   
    }

    // copy over table buffer
    {
        // copy the table buffer over
        var tablesBuffer = device.createBuffer({
            label: dataObj.id + ": copy of table buffer",
            size: tablesLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        var commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(marchData.buffers.tables, 0, tablesBuffer, 0, tablesLength * Uint32Array.BYTES_PER_ELEMENT);
        device.queue.submit([commandEncoder.finish()]);

        dataObj.marchData.buffers.tables = tablesBuffer;
        
    }

    // other buffers
    {
        var marchVarsBuffer = device.createBuffer({
            label: dataObj.id + ": march vars buffer",
            size: Float32Array.BYTES_PER_ELEMENT + 3*Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
    
        dataObj.marchData.buffers.marchVars = marchVarsBuffer;
    
        
        const offsetTotalsBufferLength = 2 + WGPrefixSumCount*2;
        
        var vertexOffsetTotalsBuffer = device.createBuffer({
            label: dataObj.id + ": vert off totals buffer",
            size: offsetTotalsBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        var indexOffsetTotalsBuffer = device.createBuffer({
            label: dataObj.id + ": ind off totals buffer",
            size: offsetTotalsBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
    
        var bufferOffsetBuffer = device.createBuffer({
            label: dataObj.id + ": buffer offset buffer",
            size: 1 * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });

        var countReadBuffer = device.createBuffer({
            label: dataObj.id + ": count read buffer",
            size: 2 * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        })

    
    
        dataObj.marchData.buffers.vertexOffsetTotals = vertexOffsetTotalsBuffer;
        dataObj.marchData.buffers.indexOffsetTotals = indexOffsetTotalsBuffer;
        dataObj.marchData.buffers.bufferOffset = bufferOffsetBuffer;
        dataObj.marchData.buffers.countReadBuffer = countReadBuffer;

        dataObj.marchData.bindGroups.marchVars = device.createBindGroup({
            layout: marchData.bindGroupLayouts.enumerate[1],
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: dataObj.marchData.buffers.marchVars
                    }
                }
            ]
        });
    
        dataObj.marchData.bindGroups.bufferOffset = device.createBindGroup({
            layout: marchData.bindGroupLayouts.prefix[1],
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: dataObj.marchData.buffers.bufferOffset
                    }
                }
            ]
        });

    }
    dataObj.marchData.bindGroups.constants = generateBG(
        dataObj.marchData.pipelines.enumerate.getBindGroupLayout(0),
        [
            dataObj.marchData.buffers.dataInfo,
            dataObj.marchData.textures.data.createView(),
            dataObj.marchData.buffers.tables
        ],
        dataObj.id + ": constants"
    )
    createOffsetBindGroups(dataObj);
}

function createMarchOutputBindGroup(vertNum, indexNum, dataObj) {
    // function to calc proper size of textures
    var get3dSizeToFit = (num) => {
        var rough1dSize = Math.round(Math.pow(num, 1/3));
        // width has to be a multiple of 256 bytes to copy to a buffer later
        // since using float (4 bytes), multiple of 64 elements
        const width = Math.ceil(rough1dSize/64)*64;
        const height = rough1dSize;
        const depth = Math.ceil(num/(width*height));

        return {
            width: width,
            height: height,
            depthOrArrayLayers: depth
        }
    }
    
    const vertTextureSize = get3dSizeToFit(vertNum*3);
    // console.log(vertTextureSize);
    const indexTextureSize = get3dSizeToFit(indexNum);

    var marchVertTexture = device.createTexture({
        label: dataObj.id + ": vert out texture",
        size: vertTextureSize,
        dimension: "3d",
        format: "r32float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
    }); 
    var marchNormalTexture = device.createTexture({
        label: dataObj.id + ": normal out texture",
        size: vertTextureSize,
        dimension: "3d",
        format: "r32float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
    });
    var marchIndexTexture = device.createTexture({
        label: dataObj.id + ": index out texture",
        size: indexTextureSize,
        dimension: "3d",
        format: "r32uint",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
    });
    


    return [
        generateBG(
            marchData.bindGroupLayouts.march[2],
            [
                marchVertTexture.createView(),
                marchNormalTexture.createView(),
                marchIndexTexture.createView()
            ],
            "march out"
        ),
        marchVertTexture,
        marchNormalTexture,
        marchIndexTexture
    ]
}

function createMarchReadBuffers(vertNum, indexNum, normals) {
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
    //console.log(dataObj);
    const WGCount = dataObj.marchData.WGCount;
    const offsetBufferLength = Math.ceil(WGCount.val/(WGPrefixSumCount*2)) * WGPrefixSumCount*2;
    //console.log("WGCount: "+ WGCount.val);
    
    var vertexOffsetBuffer = device.createBuffer({
        label: dataObj.id + ": vert offset buffer",
        size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    
    var indexOffsetBuffer = device.createBuffer({
        label: dataObj.id + ": index offset buffer",
        size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });

    dataObj.marchData.buffers.vertexOffset = vertexOffsetBuffer;
    dataObj.marchData.buffers.indexOffset = indexOffsetBuffer;        

    dataObj.marchData.bindGroups.vertexOffset = generateBG(
        dataObj.marchData.pipelines.enumerate.getBindGroupLayout(2),
        [
            vertexOffsetBuffer,
            dataObj.marchData.buffers.vertexOffsetTotals
        ]
    );

    dataObj.marchData.bindGroups.indexOffset = generateBG(
        dataObj.marchData.pipelines.enumerate.getBindGroupLayout(3),
        [
            indexOffsetBuffer,
            dataObj.marchData.buffers.indexOffsetTotals
        ]
    )
    // combined offset buffers into one bg
    dataObj.marchData.bindGroups.combinedOffset = generateBG(
        dataObj.marchData.pipelines.march.getBindGroupLayout(3),
        [
            vertexOffsetBuffer,
            indexOffsetBuffer
        ]
    )
}

async function getMarchCounts(dataObj, threshold) {
    var passEncoder;

    const WGCount = dataObj.marchData.WGCount;
    //console.log(WGCount);
    //const buffers 

    //var t0 = performance.now();
    //console.log(transformThreshold(threshold, dataObj))

    var commandEncoder = device.createCommandEncoder();
    // take up a fair amount of time
    // implement as compute shaders if they become a bottleneck
    //device.queue.writeBuffer(dataObj.marchData.buffers.data, 16, new Uint32Array([WGCount.x, WGCount.y, WGCount.z]));
    device.queue.writeBuffer(dataObj.marchData.buffers.marchVars, 0, new Float32Array([threshold, 0, 0]));
    device.queue.writeBuffer(dataObj.marchData.buffers.marchVars, 12, new Uint32Array([dataObj.marchData.cellScale]));

    device.queue.writeBuffer(dataObj.marchData.buffers.vertexOffset, 0, new Float32Array(Math.ceil(WGCount.val/(WGPrefixSumCount*2)) * WGPrefixSumCount * 2));
    device.queue.writeBuffer(dataObj.marchData.buffers.indexOffset, 0, new Float32Array(Math.ceil(WGCount.val/(WGPrefixSumCount*2)) * WGPrefixSumCount * 2));

    await commandEncoder;
    passEncoder = commandEncoder.beginComputePass();
    
    passEncoder.setPipeline(dataObj.marchData.pipelines.enumerate);
    passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.constants);
    passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.marchVars);
    passEncoder.setBindGroup(2, dataObj.marchData.bindGroups.vertexOffset);
    passEncoder.setBindGroup(3, dataObj.marchData.bindGroups.indexOffset);
    passEncoder.dispatchWorkgroups(WGCount.x, WGCount.y, WGCount.z);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()])    

    // prefix sum pass ===================================================================
    const offsetTotalsBufferLength = 2 + WGPrefixSumCount*2;
    device.queue.writeBuffer(dataObj.marchData.buffers.vertexOffsetTotals, 0, new Uint32Array(offsetTotalsBufferLength));
    device.queue.writeBuffer(dataObj.marchData.buffers.indexOffsetTotals, 0, new Uint32Array(offsetTotalsBufferLength));
    
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
        device.queue.writeBuffer(dataObj.marchData.buffers.bufferOffset, 0, Uint32Array.from([OffsetIntoOffsetBuffer]));
        if (i > 0) {
            device.queue.writeBuffer(dataObj.marchData.buffers.vertexOffsetTotals, 2*4, totalsClearArray);
            device.queue.writeBuffer(dataObj.marchData.buffers.indexOffsetTotals, 2*4, totalsClearArray);
        }
        // set to 512 for now
        thisNumBlocks = Math.max(2, Math.min(WGPrefixSumCount*2, numBlocks-OffsetIntoOffsetBuffer));
        
        //console.log(thisNumBlocks);
        
        //console.log("numblock: " + numBlocks)
        commandEncoder = await device.createCommandEncoder();
        
        
        
        // prefix sum on verts
        passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(marchData.pipelines.prefix[0]);
        passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.vertexOffset);
        passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.bufferOffset);
        passEncoder.dispatchWorkgroups(thisNumBlocks);
        passEncoder.end();

        // prefix sum on indices
        passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(marchData.pipelines.prefix[0]);
        passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.indexOffset);
        passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.bufferOffset);

        passEncoder.dispatchWorkgroups(thisNumBlocks);
        passEncoder.end();

        //commandEncoder.copyBufferToBuffer(vertexOffsetBuffer, 256*4*128*2, readBuffer, 0, 4*elems);

        //commandEncoder.copyBufferToBuffer(vertexOffsetTotalsBuffer, 0, readBuffer, 0, 4*16);
        

        //await device.queue.onSubmittedWorkDone();
        //device.queue.submit([commandEncoder.finish()])
        
        if (numBlocks > 0) {
            passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(marchData.pipelines.prefix[1]);
            passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.vertexOffset);
            passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.bufferOffset);

            passEncoder.dispatchWorkgroups(1);
            passEncoder.end();
            // for indices
            passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(marchData.pipelines.prefix[1]);
            passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.indexOffset);
            passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.bufferOffset);

            passEncoder.dispatchWorkgroups(1);
            passEncoder.end();
        }

        //await device.queue.onSubmittedWorkDone();
        device.queue.submit([commandEncoder.finish()]);

        // await readBuffer.mapAsync(GPUMapMode.READ, 0, 4*elems)
        // console.log(new Uint32Array(readBuffer.getMappedRange(0, 4*elems)));
        // readBuffer.unmap();

        OffsetIntoOffsetBuffer += thisNumBlocks;
    }
    // copy values into correct buffers
    commandEncoder = await device.createCommandEncoder();

    commandEncoder.copyBufferToBuffer(dataObj.marchData.buffers.vertexOffsetTotals, 4, dataObj.marchData.buffers.countReadBuffer, 0, 4);
    commandEncoder.copyBufferToBuffer(dataObj.marchData.buffers.vertexOffsetTotals, 4, dataObj.marchData.buffers.marchVars, 4, 4);
    commandEncoder.copyBufferToBuffer(dataObj.marchData.buffers.indexOffsetTotals, 4, dataObj.marchData.buffers.countReadBuffer, 4, 4);
    commandEncoder.copyBufferToBuffer(dataObj.marchData.buffers.indexOffsetTotals, 4, dataObj.marchData.buffers.marchVars, 8, 4);
    
    //commandEncoder.copyBufferToBuffer(indexOffsetBuffer, 0, readBuffer, 0, 7776*4);

    //await device.queue.onSubmittedWorkDone();
    device.queue.submit([commandEncoder.finish()]);
    
    //device.queue.submit(prefixSumCommands);
    
    await dataObj.marchData.buffers.countReadBuffer.mapAsync(GPUMapMode.READ, 0, 8) 
    const lengths = new Uint32Array(dataObj.marchData.buffers.countReadBuffer.getMappedRange());
    var vertNum = lengths[0];
    var indNum = lengths[1];
    //console.log("verts:", vertNum, indNum);  
    dataObj.marchData.buffers.countReadBuffer.unmap();

    return [vertNum, indNum];
}

async function copyMarchTexturesToBuffers(vertTex, normTex, indTex) {
    var commandEncoder;

    const vertTexCopySize = {
        width: vertTex.width,
        height: vertTex.height,
        depthOrArrayLayers: vertTex.depthOrArrayLayers
    }

    const indTexCopySize = {
        width: indTex.width,
        height: indTex.height,
        depthOrArrayLayers: indTex.depthOrArrayLayers
    }

    const vertTexSize = vertTex.width*vertTex.height*vertTex.depthOrArrayLayers;
    const indTexSize = indTex.width*indTex.height*indTex.depthOrArrayLayers;

    var marchVertBuffer = device.createBuffer({
        label: "vert buffer",
        size: vertTexSize * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
    }); 

    commandEncoder = await device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
        {texture: vertTex}, 
        {
            buffer: marchVertBuffer,
            bytesPerRow: vertTexCopySize.width * 4,
            rowsPerImage: vertTexCopySize.height
        }, 
        vertTexCopySize
    );
    device.queue.submit([commandEncoder.finish()]) 
    device.queue.onSubmittedWorkDone();
    vertTex.destroy();

    var marchNormalBuffer = device.createBuffer({
        label: "normal buffer",
        size: vertTexSize * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
    });
    commandEncoder = await device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
        {texture: normTex}, 
        {
            buffer: marchNormalBuffer,
            bytesPerRow: vertTexCopySize.width * 4,
            rowsPerImage: vertTexCopySize.height
        }, 
        vertTexCopySize
    );
    device.queue.submit([commandEncoder.finish()]) 
    device.queue.onSubmittedWorkDone();
    normTex.destroy();

    var marchIndexBuffer = device.createBuffer({
        label: "index buffer",
        size: indTexSize * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.INDEX
    });
    commandEncoder = await device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
        {texture: indTex}, 
        {
            buffer: marchIndexBuffer,
            bytesPerRow: indTexCopySize.width * 4,
            rowsPerImage: indTexCopySize.height
        }, 
        indTexCopySize
    );
    device.queue.submit([commandEncoder.finish()]) 
    device.queue.onSubmittedWorkDone();
    indTex.destroy();

    return {
        vertex: marchVertBuffer,
        // normals will be all 0 vectors
        normal: marchNormalBuffer,
        index: marchIndexBuffer
    }
}

async function copyBuffersToCPUSide(meshObj) {
    var commandEncoder, range;

    var marchVertReadBuffer = device.createBuffer({
        size: 3 * meshObj.vertsNum * Float32Array.BYTES_PER_ELEMENT,
        usage:  GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    }); 
    commandEncoder = await device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(meshObj.buffers.vertex, 0, marchVertReadBuffer, 0, 3 * meshObj.vertsNum * 4);
    device.queue.submit([commandEncoder.finish()]) 
    device.queue.onSubmittedWorkDone();

    await marchVertReadBuffer.mapAsync(GPUMapMode.READ);

    range = marchVertReadBuffer.getMappedRange();
    meshObj.verts = new Float32Array(3 * meshObj.vertsNum * 4);
    meshObj.verts.set(new Float32Array(range));
    marchVertReadBuffer.unmap();
    marchVertReadBuffer.destroy();


    if (meshObj.marchNormals) {
        var marchNormalReadBuffer = device.createBuffer({
            size: 3 * meshObj.vertsNum * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        commandEncoder = await device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(meshObj.buffers.normal, 0, marchNormalReadBuffer, 0, 3 * meshObj.vertsNum * 4);
        device.queue.submit([commandEncoder.finish()]) 
        device.queue.onSubmittedWorkDone();

        await marchNormalReadBuffer.mapAsync(GPUMapMode.READ);
    
        range = marchNormalReadBuffer.getMappedRange();
        meshObj.normals = new Float32Array(3 * meshObj.vertsNum * 4);
        meshObj.normals.set(new Float32Array(range));
        marchNormalReadBuffer.unmap();
        marchNormalReadBuffer.destroy();
    }


    var marchIndexReadBuffer = device.createBuffer({
        size: meshObj.indicesNum * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    commandEncoder = await device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(meshObj.buffers.index, 0, marchIndexReadBuffer, 0, meshObj.indicesNum * 4);
    device.queue.submit([commandEncoder.finish()]) 
    device.queue.onSubmittedWorkDone();

    await marchIndexReadBuffer.mapAsync(GPUMapMode.READ);

    range = marchIndexReadBuffer.getMappedRange();
    meshObj.indices = new Uint32Array(meshObj.indicesNum * 4);
    meshObj.indices.set(new Uint32Array(range));
    marchIndexReadBuffer.unmap();
    marchIndexReadBuffer.destroy();
}

async function march(dataObj, meshObj, threshold) {
    
    var passEncoder;

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

    // marching pass =====================================================================

    if (vertNum == 0 || indNum == 0) {
        // if mesh is now empty, update
        meshObj.indicesNum = indNum;
        meshObj.vertsNum = vertNum;
        meshObj.verts = new Float32Array();
        meshObj.normals = new Float32Array();
        meshObj.indices = new Float32Array();
        console.log("no verts")
        return;
    } else if (vertNum > 40000000){
        // if more than a semi-arbitrary threshold value
        console.log("sorry, too many vertices")
        return
    } else {
        meshObj.indicesNum = indNum;
        meshObj.vertsNum = vertNum;
        // console.log(vertNum, indNum);
    }


    deleteBuffers(meshObj);

    // create textures for holding verts + ind
    var [marchOutBindGroup, marchVertTexture, marchNormalTexture, marchIndexTexture] = createMarchOutputBindGroup(vertNum, indNum, dataObj);
    

    var commandEncoder = device.createCommandEncoder();
    //device.queue.writeBuffer(marchVarsBuffer, 0, new Float32Array([threshold, 0, 0]));

    await commandEncoder;
    passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(dataObj.marchData.pipelines.march);

    passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.constants);
    passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.marchVars);
    passEncoder.setBindGroup(2, marchOutBindGroup);
    passEncoder.setBindGroup(3, dataObj.marchData.bindGroups.combinedOffset);
    passEncoder.dispatchWorkgroups(
        Math.ceil(dataObj.size[0]/WGSize.x),
        Math.ceil(dataObj.size[1]/WGSize.y),
        Math.ceil(dataObj.size[2]/WGSize.z)
    );

    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    
    meshObj.buffers = await copyMarchTexturesToBuffers(marchVertTexture, marchNormalTexture, marchIndexTexture);
    if (meshObj.forceCPUSide) {
        await copyBuffersToCPUSide(meshObj);
    }
    //await device.queue.onSubmittedWorkDone();
}


async function updateActiveBlocks(dataObj, activeBlocks) {
    dataObj.marchData.activeBlocksCount = activeBlocks.length;

    dataObj.marchData.buffers.activeBlocks?.destroy();
    dataObj.marchData.buffers.vertexOffsetFine?.destroy();
    dataObj.marchData.buffers.indexOffsetFine?.destroy();

    var activeBlocksBuffer = device.createBuffer({
        label: dataObj.id + ": active blocks buffer",
        size: 4*Math.ceil(activeBlocks.length/4)*4,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true
    }); 

    new Uint32Array(activeBlocksBuffer.getMappedRange(), 0, activeBlocks.length).set(activeBlocks);
    activeBlocksBuffer.unmap();

    dataObj.marchData.buffers.activeBlocks = activeBlocksBuffer;

    console.log("active blocks:", activeBlocks.length);

    // create offset buffers
    {
        const offsetBufferLength = Math.ceil(activeBlocks.length/(WGPrefixSumCount*2)) * WGPrefixSumCount*2;
        
        var vertexOffsetBuffer = device.createBuffer({
            label: dataObj.id + ": fine vert offset buffer",
            size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        
        var indexOffsetBuffer = device.createBuffer({
            label: dataObj.id + ": fine index offset buffer",
            size: offsetBufferLength * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
    
        dataObj.marchData.buffers.vertexOffsetFine = vertexOffsetBuffer;
        dataObj.marchData.buffers.indexOffsetFine = indexOffsetBuffer;        
        
        dataObj.marchData.bindGroups.vertexOffsetFine = generateBG(
            marchData.pipelines.prefix[0].getBindGroupLayout(0),
            [
                vertexOffsetBuffer,
                dataObj.marchData.buffers.vertexOffsetTotals
            ],
            "prefix 0 fine, vert"

        );
        
        dataObj.marchData.bindGroups.indexOffsetFine = generateBG(
            marchData.pipelines.prefix[0].getBindGroupLayout(0),
            [
                indexOffsetBuffer,
                dataObj.marchData.buffers.indexOffsetTotals
            ],
            "prefix 0 fine, ind"
        )
    
        // combined offset buffers into one bg
        dataObj.marchData.bindGroups.combinedOffsetFine = generateBG(
            dataObj.marchData.pipelines.enumerateFine.getBindGroupLayout(2),
            [
                vertexOffsetBuffer,
                indexOffsetBuffer
            ],
            "enumerate fine 2"
        )
    }
}
// run when the fine data is changed before marching through it
// deals with loading the data onto the gpu, creating buffers and bindgroups
// and cleaning up the previous buffers if they exist

// need block locations
async function updateMarchFineData(dataObj, addBlocks, removeBlocks, fineData, finePointsData) {
    console.log("to add:", addBlocks.length);
    console.log("to remove:", removeBlocks.length);
    console.log("length of new data:", fineData.length);
    // NEW FLOW:
    // create a read buffer same size as locations occupied buffer (copydst, mapread)
    var readBuffer = device.createBuffer({
        label: "loc occupied read buffer",
        size: dataObj.marchData.buffers.locationsOccupied.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    // copy occupied locations into this new buffer

    var commandEncoder = await device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(
        dataObj.marchData.buffers.locationsOccupied,
        0,
        readBuffer,
        0,
        dataObj.marchData.buffers.locationsOccupied.size
    )

    device.queue.submit([commandEncoder.finish()]) 
    device.queue.onSubmittedWorkDone();



    // map read buffer (u32)
    await readBuffer.mapAsync(GPUMapMode.READ, 0, dataObj.marchData.buffers.locationsOccupied.size);
    // do a linear search and create list of all locations not occupied
    const locationsOccupied = new Uint32Array(readBuffer.getMappedRange());
    var emptyLocations = [];
    for (let i = 0; i < locationsOccupied.length; i++) {
        if (locationsOccupied[i] == 0) emptyLocations.push(i);
    }
    console.log("empty locations:", emptyLocations.length);
    console.log("total locations:", locationsOccupied.length);
    // unmap and destroy read buffer
    readBuffer.unmap();
    readBuffer.destroy();
    // create new empty locations buffer (mapped)
    dataObj.marchData.buffers.emptyLocations = device.createBuffer({
        label: "empty locations buffer",
        size: Math.max(1, emptyLocations.length) * 4,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true
    });

    // write empty locations list into it and unmap
    new Uint32Array(dataObj.marchData.buffers.emptyLocations.getMappedRange()).set(emptyLocations);
    dataObj.marchData.buffers.emptyLocations.unmap();

    // create storage texture same size as fine data texture
    // going to be altered by the shader by adding/removing blocks
    const fineDataTextureSize = {
        width: dataObj.marchData.textures.dataFine.width,
        height: dataObj.marchData.textures.dataFine.height,
        depthOrArrayLayers: dataObj.marchData.textures.dataFine.depthOrArrayLayers
    }
    dataObj.marchData.textures.fineDataStorage = device.createTexture({
        label: "writeable fine data",
        size: fineDataTextureSize,
        dimension: "3d",
        format: dataObj.marchData.textures.dataFine.format,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
    })

    // copy fine data into this new texture
    commandEncoder = await device.createCommandEncoder();
    commandEncoder.copyTextureToTexture(
        {
            texture: dataObj.marchData.textures.dataFine,
        },
        {
            texture: dataObj.marchData.textures.fineDataStorage,
        },
        fineDataTextureSize
    )
    device.queue.submit([commandEncoder.finish()]) 
    device.queue.onSubmittedWorkDone();


    // make add block buffer
    dataObj.marchData.buffers.addBlocks = device.createBuffer({
        label: "add blocks buffer",
        size: Math.max(1, addBlocks.length) * 4,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true
    });
    new Uint32Array(dataObj.marchData.buffers.addBlocks.getMappedRange()).set(addBlocks);
    dataObj.marchData.buffers.addBlocks.unmap();

    // make remove block buffer
    dataObj.marchData.buffers.removeBlocks = device.createBuffer({
        label: "remove blocks buffer",
        size: Math.max(1, removeBlocks.length) * 4,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true
    });
    new Uint32Array(dataObj.marchData.buffers.removeBlocks.getMappedRange()).set(removeBlocks);
    dataObj.marchData.buffers.removeBlocks.unmap();

    // make update info buffer
    dataObj.marchData.buffers.updateInfo = device.createBuffer({
        label: "update info buffer",
        size: 4 * 4,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true
    });
    new Uint32Array(dataObj.marchData.buffers.updateInfo.getMappedRange()).set([
        addBlocks.length > 0,
        removeBlocks.length > 0,
        emptyLocations.length > 0,
        dataObj.blockVol
    ]);
    dataObj.marchData.buffers.updateInfo.unmap();

    // make texture with new fine data
    const newFineDataTextureSize = {
        width: fineDataTextureSize.width,
        height: fineDataTextureSize.height,
        depthOrArrayLayers: Math.max(1, Math.ceil(fineData.length/(fineDataTextureSize.width * fineDataTextureSize.height)))
    }
    dataObj.marchData.textures.newFineData = device.createTexture({
        label: "new fine data tex",
        size: newFineDataTextureSize,
        dimension: "3d",
        format: dataObj.marchData.textures.dataFine.format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });

    // make an array for all the new data
    var stride = 1;
    if (finePointsData) stride = 4;
    var newFineDataBuffer = new Float32Array(
        newFineDataTextureSize.width*newFineDataTextureSize.height*newFineDataTextureSize.depthOrArrayLayers*stride
    )

    // set the new data into the texture
    if (finePointsData) {
        for (let i = 0; i < newFineDataBuffer.length/4; i++) {
            newFineDataBuffer[4*i + 0] = fineData[i];
            newFineDataBuffer[4*i + 1] = finePointsData[3*i + 0];
            newFineDataBuffer[4*i + 2] = finePointsData[3*i + 1];
            newFineDataBuffer[4*i + 3] = finePointsData[3*i + 2];
        }
    } else {
        newFineDataBuffer.set(fineData);
    }

    device.queue.writeTexture(
        {
            texture: dataObj.marchData.textures.newFineData
        },
        newFineDataBuffer,
        {
            offset: 0,
            bytesPerRow: newFineDataTextureSize.width * 4 * stride,
            rowsPerImage: newFineDataTextureSize.height
        },
        newFineDataTextureSize
    )

    // run the update shader
    var commandEncoder = await device.createCommandEncoder();
    var passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(dataObj.marchData.pipelines.updateFineData);
    passEncoder.setBindGroup(0, generateBG(
        dataObj.marchData.pipelines.updateFineData.getBindGroupLayout(0),
        [
            dataObj.marchData.textures.fineDataStorage.createView(),
            dataObj.marchData.textures.newFineData.createView(),
            dataObj.marchData.buffers.addBlocks,
            dataObj.marchData.buffers.removeBlocks,
            dataObj.marchData.buffers.updateInfo
        ],
        "update fine data 0"
    ))
    passEncoder.setBindGroup(1, generateBG(
        dataObj.marchData.pipelines.updateFineData.getBindGroupLayout(1),
        [
            dataObj.marchData.buffers.blockLocations,
            dataObj.marchData.buffers.emptyLocations,
            dataObj.marchData.buffers.locationsOccupied
        ],
        "update fine data 1"
    ))

    passEncoder.dispatchWorkgroups(Math.ceil(Math.max(addBlocks.length, removeBlocks.length)/MaxWGSize));
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()])  
    await device.queue.onSubmittedWorkDone();

    // copy the updated storage texture into fine data texture
    commandEncoder = await device.createCommandEncoder();
    commandEncoder.copyTextureToTexture(
        {
            texture: dataObj.marchData.textures.fineDataStorage,
        },
        {
            texture: dataObj.marchData.textures.dataFine,
        },
        fineDataTextureSize
    )
    device.queue.submit([commandEncoder.finish()]) 
    // delete all temp resources
    await device.queue.onSubmittedWorkDone();
    dataObj.marchData.textures.fineDataStorage.destroy();
    dataObj.marchData.textures.newFineData.destroy();
    dataObj.marchData.buffers.addBlocks.destroy();
    dataObj.marchData.buffers.removeBlocks.destroy();
    dataObj.marchData.buffers.emptyLocations.destroy();
}

async function marchFine(dataObj, meshObj, threshold) {
    // if (dataObj.fineData.length == 0) return;
    
    var passEncoder;

    // make the bindgroup for the data
    dataObj.marchData.bindGroups.dataFine = generateBG(
        dataObj.marchData.pipelines.enumerateFine.getBindGroupLayout(1),
        [
            dataObj.marchData.buffers.dataInfoFine,
            dataObj.marchData.textures.dataFine.createView(),
            dataObj.marchData.buffers.activeBlocks,
            dataObj.marchData.buffers.blockLocations
        ],
        "fine data BG 1"
    )

    // =============================================================================

    // write threshold 
    device.queue.writeBuffer(dataObj.marchData.buffers.dataInfoFine, 0, new Float32Array([threshold]));

    const maxWG = device.limits.maxComputeWorkgroupsPerDimension;
    var totalBlocks = dataObj.marchData.activeBlocksCount;
    var thisNumBlocks;
    var blockOffset = 0;

    for (let i = 0; i < Math.ceil(totalBlocks/maxWG); i++) {
        var commandEncoder = await device.createCommandEncoder();
        device.queue.writeBuffer(dataObj.marchData.buffers.dataInfoFine, 4, new Uint32Array([blockOffset]));
        thisNumBlocks =  Math.min(maxWG, totalBlocks-blockOffset);

        passEncoder = commandEncoder.beginComputePass();
    
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
    device.queue.writeBuffer(dataObj.marchData.buffers.vertexOffsetTotals, 0, new Uint32Array(offsetTotalsBufferLength));
    device.queue.writeBuffer(dataObj.marchData.buffers.indexOffsetTotals, 0, new Uint32Array(offsetTotalsBufferLength));
    
    // prefix sum on verts
    // starts as total number of values in totals
    const numBlocks = Math.ceil(dataObj.marchData.activeBlocksCount/(WGPrefixSumCount*2));
    var thisNumBlocks
    var OffsetIntoOffsetBuffer = 0;
    
    const elems = 32;
    const totalsClearArray = new Uint32Array(WGPrefixSumCount*2);

    //                  number of rounds to do
    for (let i = 0; i < numBlocks/(WGPrefixSumCount*2); i++) {
        //console.log("round " + i)
        device.queue.writeBuffer(dataObj.marchData.buffers.bufferOffset, 0, Uint32Array.from([OffsetIntoOffsetBuffer]));
        if (i > 0) {
            device.queue.writeBuffer(dataObj.marchData.buffers.vertexOffsetTotals, 2*4, totalsClearArray);
            device.queue.writeBuffer(dataObj.marchData.buffers.indexOffsetTotals, 2*4, totalsClearArray);
        }
        
        thisNumBlocks = Math.max(2, Math.min(WGPrefixSumCount*2, numBlocks-OffsetIntoOffsetBuffer));
        
        //console.log(thisNumBlocks);
        
        //console.log("numblock: " + numBlocks)
        commandEncoder = await device.createCommandEncoder();
        
        
        
        // prefix sum on verts
        passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(marchData.pipelines.prefix[0]);
        passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.vertexOffsetFine);
        passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.bufferOffset);
        passEncoder.dispatchWorkgroups(thisNumBlocks);
        passEncoder.end();

        // prefix sum on indices
        passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(marchData.pipelines.prefix[0]);
        passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.indexOffsetFine);
        passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.bufferOffset);

        passEncoder.dispatchWorkgroups(thisNumBlocks);
        passEncoder.end();
        
        if (numBlocks > 0) {
            passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(marchData.pipelines.prefix[1]);
            passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.vertexOffsetFine);
            passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.bufferOffset);

            passEncoder.dispatchWorkgroups(1);
            passEncoder.end();
            // for indices
            passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(marchData.pipelines.prefix[1]);
            passEncoder.setBindGroup(0, dataObj.marchData.bindGroups.indexOffsetFine);
            passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.bufferOffset);

            passEncoder.dispatchWorkgroups(1);
            passEncoder.end();
        }

        //await device.queue.onSubmittedWorkDone();
        device.queue.submit([commandEncoder.finish()]);

        OffsetIntoOffsetBuffer += thisNumBlocks;
    }
    // copy values into correct buffers
    commandEncoder = await device.createCommandEncoder();

    commandEncoder.copyBufferToBuffer(dataObj.marchData.buffers.vertexOffsetTotals, 4, dataObj.marchData.buffers.fineCountReadBuffer, 0, 4);
    commandEncoder.copyBufferToBuffer(dataObj.marchData.buffers.indexOffsetTotals, 4, dataObj.marchData.buffers.fineCountReadBuffer, 4, 4);

    device.queue.submit([commandEncoder.finish()]);
    
    //device.queue.submit(prefixSumCommands);
    
    await dataObj.marchData.buffers.fineCountReadBuffer.mapAsync(GPUMapMode.READ, 0, 8) 
    const lengths = new Uint32Array(dataObj.marchData.buffers.fineCountReadBuffer.getMappedRange());
    var vertNum = lengths[0];
    var indNum = lengths[1];
    //console.log("fine verts + inds:", vertNum, indNum);  
    dataObj.marchData.buffers.fineCountReadBuffer.unmap();


    // march pass =====================================================================================
    // meshObj.indicesNum = indNum;
    // meshObj.vertsNum = vertNum;
    // console.log(vertNum, indNum);

    if (vertNum == 0 || indNum == 0) {
        // if mesh is now empty, update
        meshObj.indicesNum = indNum;
        meshObj.vertsNum = vertNum;
        meshObj.verts = new Float32Array();
        meshObj.normals = new Float32Array();
        meshObj.indices = new Float32Array();
        console.log("no verts")
        return;
    } else if (vertNum > 40000000){
        // if more than a semi-arbitrary threshold value
        console.log("sorry, too many vertices")
        return
    } else {
        meshObj.indicesNum = indNum;
        meshObj.vertsNum = vertNum;
    }

    deleteBuffers(meshObj);
    var [marchOutBindGroup, marchVertTexture, marchNormalTexture, marchIndexTexture] = createMarchOutputBindGroup(vertNum, indNum, dataObj);
    // var [marchOutBindGroup, marchVertBuffer, marchNormalBuffer, marchIndexBuffer] = createMarchFineOutputBindGroup(vertNum, indNum, dataObj);
    
    

    totalBlocks = dataObj.marchData.activeBlocksCount;
    blockOffset = 0;

    for (let i = 0; i < Math.ceil(totalBlocks/maxWG); i++) {
        var commandEncoder = await device.createCommandEncoder();
        device.queue.writeBuffer(dataObj.marchData.buffers.dataInfoFine, 4, new Uint32Array([blockOffset]));
        thisNumBlocks =  Math.min(maxWG, totalBlocks-blockOffset);

        var commandEncoder = await device.createCommandEncoder();

        passEncoder = commandEncoder.beginComputePass();
        
        passEncoder.setPipeline(dataObj.marchData.pipelines.marchFine);
        passEncoder.setBindGroup(0, marchData.bindGroups.tables);
        passEncoder.setBindGroup(1, dataObj.marchData.bindGroups.dataFine);
        passEncoder.setBindGroup(2, marchOutBindGroup);
        passEncoder.setBindGroup(3, dataObj.marchData.bindGroups.combinedOffsetFine);
        passEncoder.dispatchWorkgroups(thisNumBlocks);
        passEncoder.end();

        // commandEncoder.copyBufferToBuffer(marchVertBuffer, 0, marchData.buffers.read, 0, 10*4);

        device.queue.submit([commandEncoder.finish()]);
        blockOffset += thisNumBlocks;
    }

    meshObj.buffers = await copyMarchTexturesToBuffers(marchVertTexture, marchNormalTexture, marchIndexTexture);
    if (meshObj.forceCPUSide) {
        await copyBuffersToCPUSide(meshObj);
    }
}

async function cleanupMarchData(dataObj) {
    for (let key in dataObj.marchData.buffers) {
        dataObj.marchData.buffers[key].destroy();
    }
}


// rendering functions ==========================================================================================

async function setupRenderer(canvas) {
    if (!device) {
        await setupWebGPU();
    }
    
    var ctx = canvas.getContext("webgpu");

    // setup swapchain
    ctx.configure({
        device: device,
        format: "bgra8unorm",
        alphaMode: "opaque"
    });

    // TODO: seperate pipeline for rendering views and copying to main texture

    uniformBuffer = device.createBuffer({
        label: "uniform buffer",
        size: 16*2*Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    shaderCode = await shaderCode;
    meshRenderPipeline = createMeshRenderPipeline();
    pointsRenderPipeline =  createPointsRenderPipeline();

    meshBindGroup = device.createBindGroup({
        layout: meshRenderPipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {
                buffer: uniformBuffer
            }
        }]
    });

    pointsBindGroup = device.createBindGroup({
        layout: pointsRenderPipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {
                buffer: uniformBuffer
            }
        }]
    });

    return ctx;
}

function createMeshRenderPipeline() {
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

function createPointsRenderPipeline() {
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
            topology: "point-list"
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
    console.log("u")

    if (mesh.verts.length > 0) {
        mesh.buffers.vertex = createFilledBuffer("f32", mesh.verts, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
        console.log("v")
    }
    if (mesh.normals.length > 0) {
        mesh.buffers.normal = createFilledBuffer("f32", mesh.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
        console.log("n")
    }
    if (mesh.indices.length > 0) {
        mesh.buffers.index = createFilledBuffer("u32", mesh.indices, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
        console.log("i")
    }
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
};

// clears the screen and creates the empty depth texture
async function clearScreen(ctx) {
    

    var commandEncoder = device.createCommandEncoder();
    // provide details of load and store part of pass
    // here there is one color output that will be cleared on load

    var depthStencilTexture = device.createTexture({
        label: "depth texture",
        size: {
          width: ctx.canvas.width,
          height: ctx.canvas.height,
          depth: 1
        },
        dimension: "2d",
        format: "depth32float",
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
            depthStoreOp: "discard",
            view: depthStencilTexture.createView()
          }
    };

    await commandEncoder;
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    depthStencilTexture.destroy();
};

async function renderView(ctx, projMat, modelViewMat, box, meshes, points) {
    
    // make a common depth texture for the view frame
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

    // loop through and draw each mesh
    for (let i = 0; i < meshes.length; i++) {
        var meshObj = meshes[i];
        if (meshObj.indicesNum == 0 && meshObj.vertsNum == 0) {
            continue;
        }

        var commandEncoder = device.createCommandEncoder();
        // provide details of load and store part of pass
        // here there is one color output that will be cleared on load

        var renderPassDescriptor;
        if (i == 0) {
            // for first mesh, need to clear the colour and depth images
            renderPassDescriptor = {
                colorAttachments: [{
                    clearValue: clearColor,
                    loadOp: "load",
                    storeOp: "store",
                    view: ctx.getCurrentTexture().createView()
                }],
                depthStencilAttachment: {
                    depthClearValue: 1.0,
                    depthLoadOp: "clear",
                    depthStoreOp: "store",
                    view: depthStencilTexture.createView()
                }
            };
        } else {
            renderPassDescriptor = {
                colorAttachments: [{
                    clearValue: clearColor,
                    loadOp: "load",
                    storeOp: "store",
                    view: ctx.getCurrentTexture().createView()
                }],
                depthStencilAttachment: {
                    depthClearValue: 1.0,
                    depthLoadOp: "load",
                    depthStoreOp: "store",
                    view: depthStencilTexture.createView()
                }
            };
        }
        
        

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

            // if (meshObj.buffers.vertex.state != undefined) {
            //     console.log(meshObj.buffers.vertex.state);
            // }
            if (points) {
                // check if the buffers are not destroyed
                passEncoder.setPipeline(pointsRenderPipeline);
                passEncoder.setVertexBuffer(0, meshObj.buffers.vertex);
                passEncoder.setVertexBuffer(1, meshObj.buffers.normal);
                passEncoder.setBindGroup(0, pointsBindGroup);
                passEncoder.draw(meshObj.vertsNum);
            } else {
                passEncoder.setPipeline(meshRenderPipeline);
                passEncoder.setIndexBuffer(meshObj.buffers.index, "uint32");
                passEncoder.setVertexBuffer(0, meshObj.buffers.vertex);
                passEncoder.setVertexBuffer(1, meshObj.buffers.normal);
                passEncoder.setBindGroup(0, meshBindGroup);
                passEncoder.drawIndexed(meshObj.indicesNum);
            }
        }
        
        passEncoder.end();

        // write uniforms to buffer
        device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([...projMat, ...modelViewMat]))
        device.queue.submit([commandEncoder.finish()]);
    }
    depthStencilTexture.destroy();
    //await device.queue.onSubmittedWorkDone();
    //console.log("rendered")
    
}

async function renderMesh(ctx, projMat, modelViewMat, box, meshObj, points) {
    if (meshObj.indicesNum == 0 && meshObj.vertsNum == 0) {
        return;
    }
    var commandEncoder = device.createCommandEncoder();
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

    var renderPassDescriptor = {
        colorAttachments: [{
            clearValue: clearColor,
            loadOp: "load",
            storeOp: "store",
            view: ctx.getCurrentTexture().createView()
        }],
        depthStencilAttachment: {
            depthClearValue: 1.0,
            depthLoadOp: "load",
            depthStoreOp: "store",
            view: depthStencilTexture.createView()
        }
    };

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

        if (points) {
            // check if the buffers are not destroyed
            passEncoder.setPipeline(pointsRenderPipeline);
            passEncoder.setVertexBuffer(0, meshObj.buffers.vertex);
            passEncoder.setVertexBuffer(1, meshObj.buffers.normal);
            passEncoder.setBindGroup(0, pointsBindGroup);
            passEncoder.draw(meshObj.vertsNum);
        } else {
            passEncoder.setPipeline(meshRenderPipeline);
            passEncoder.setIndexBuffer(meshObj.buffers.index, "uint32");
            passEncoder.setVertexBuffer(0, meshObj.buffers.vertex);
            passEncoder.setVertexBuffer(1, meshObj.buffers.normal);
            passEncoder.setBindGroup(0, meshBindGroup);
            passEncoder.drawIndexed(meshObj.indicesNum);
        }
    }
    
    passEncoder.end();

    // write uniforms to buffer
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([...projMat, ...modelViewMat]))
    device.queue.submit([commandEncoder.finish()]);
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

