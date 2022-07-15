// data.js
// handles the storing of the data object, normals etc

import {VecMath} from "./VecMath.js";
import {vec3} from "https://cdn.skypack.dev/gl-matrix";
import { newId, DATA_TYPES, xyzToA, parseXML } from "./utils.js";
import { decompressB64Str, getNumPiecesFromVTS, getDataNamesFromVTS, getPointsFromVTS, getExtentFromVTS, getPointDataFromVTS, getDataLimitsFromVTS} from "./dataUnpacker.js"
export {dataManager};

const blockSize = [4, 4, 4]

// object that manages data object instances
// types of data object creatable:
// - from a function
//   a function is supplied as well as dimensions and the full dataset is generated on creation
// - from a file (simple)
//   a source path is specified and the whole dataset is loaded on creation
// - from a file (complex)
//   a dataset name is specified and a coars global set of data is loaded on creation
//   when marching, a finer set of data for the threshold region can be requested

var dataManager = {
    datas: {},
    // called by outside code to generate a new data object
    // config object form:
    // {
    //     "name": "engine",
    //     "path": "engine_256x256x128_uint8.raw",
    //     "type": "raw",
    //     "size": {
    //         "x": 128,
    //         "y": 256,
    //         "z": 256
    //     },
    //     "cellSize": {
    //         "x": 1,
    //         "y": 1,
    //         "z": 1
    //     },
    //     "dataType": "uint8"
    //     "f": some function
    //     "accessType": "whole"/"complex"
    // }
    createData: async function(config){
        const id = newId(this.datas);
        var newData = new this.Data(id);
        if (config.f) {
            //create data from the supplied function
            newData.generateData(...xyzToA(config.size), config.f);
        } else if (config.type == "raw") {
            // handle raw data
            if (config.accessType == "complex") {
                // this is going to use the complex dataset handling mechanism
                await newData.createComplex(config)
            } else if (config.accessType == "whole") {
                // create a new data object from a file
                await newData.fromRawFile(config.path, DATA_TYPES[config.dataType], ...xyzToA(config.size))
            }
        } else if (config.type == "structuredGrid") {
            // handle structured grid .vts files
            await newData.fromVTSFile(config.path);
        }
        
        this.datas[id] = newData;

        return newData;
    },
    Data: function(id) {
        this.id = id;
        // a set of data associated with points
        // complex:
        // - a low resolution of whole dataset for fast scrolling
        // simple:
        // - the whole dataset
        this.data = [];
        // what this.data represents
        this.dataName = "";
        // used by the .vts format to place points in space
        this.points = [];
        // used to store the limit values of each block if in complex mode
        this.blockLimits = [];
        // used to store fine data for complex mode
        this.fineData = [];
        // stores the dimensions of the dataset in blocks
        this.blocksSize = [];
        // flag for if this is a complex data object
        this.complex = false;
        // flag for if this is a structuredgrid object (.vts)
        this.structuredGrid = false;
        this.normals = [];
        this.normalsInitialised = false;
        this.normalsPopulated = false;

        // these following attributes apply to the data stored in this.data
        // simple:
        // - these reflect the values for the actual dataset
        // complex:
        // - these reflect the values for the coarse, whole view
        this.maxSize = 0;
        this.maxCellSize = 0;
        this.volume = 0;
        this.midPoint = [];
        this.size = [];
        this.cellSize = [1, 1, 1];

        // min, max
        this.limits = [undefined, undefined];
        // holds any information the marching implementation needs e.g. the data buffer on gpu
        this.marchData = {};
        this.index = function(i, j, k) {
            return this.data[i * this.size[1] * this.size[2] + j * this.size[2] + k];
        };
        this.indexNormals = function(i, j, k) {
            const ind = 3 * (i * this.size[1] * this.size[2] + j * this.size[2] + k);
            return [this.normals[ind], this.normals[ind+1], this.normals[ind+2]];
        };
        this.setNormal = function(i, j, k, val) {
            const ind = 3 * (i * this.size[1] * this.size[2] + j * this.size[2] + k);
            this.normals[ind] = val[0];
            this.normals[ind+1] = val[1];
            this.normals[ind+2] = val[2];
        }
        // sets up the supporting attributs of the data using
        // the dimensions of the data buffer in 3d: x, y, z
        // the cell size: sx, sy, sz
        this.initialise = function(x, y, z, sx, sy, sz) {
            this.normalsInitialised = false;
            this.normalsPopulated = false;
            this.volume = x * y * z;
            this.maxSize = Math.max(x, y, z);
            this.midPoint = [(x-1)/2*sx, (y-1)/2*sy, (z-1)/2*sz];
            this.size = [x, y, z];
            this.cellsCount = (x-1)*(y-1)*(z-1);
            this.cellSize = [sx, sy, sz]
            this.maxCellSize = Math.max(sx, sy, sz)
            this.initialised = true;
            console.log("initialised");
        }
        this.initialiseVTS = function(x, y, z,) {
            this.normalsInitialised = false;
            this.normalsPopulated = false;
            this.volume = x * y * z; // total number of points
            this.size = [x, y, z]; // in points
            this.maxCellSize = 1; // so camera initialises properly
            this.cellsCount = (x-1)*(y-1)*(z-1);

            // get two points on opposit corners
            const p0 = [this.points[0], this.points[1], this.points[2]]
            const p1 = [this.points[this.cellsCount], this.points[this.cellsCount+1], this.points[this.cellsCount+2]]

            this.maxSize = VecMath.magnitude(VecMath.vecMinus(p0, p1));
            this.midPoint = VecMath.scalMult(0.5, VecMath.vecAdd(p0, p1));
            
            
            this.initialised = true;
            console.log("initialised");
        }
        this.generateData = function(x, y, z, f) {
            let v = 0.0;
            this.data = new Float32Array(x * y * z);
            for (let i = 0; i < x; i++) {
                for (let j = 0; j < y; j++) {
                    for (let k = 0; k < z; k++) {
                        // values are clamped to >= 0
                        v = Math.max(0, f(i, j, k));
                        if (!this.limits[0] || v < this.limits[0]) {
                            this.limits[0] = v;
                        } else if (!this.limits[1] || v > this.limits[1]) {
                            this.limits[1] = v;
                        }this.data[i * y * z + j * z + k] = v;
                        
                    }
                }
            }
            console.log(this.limits);
            this.initialise(x, y, z, ...this.cellSize);
        };
        this.fromRawFile = function(src, DataType, x, y, z) {
            var that = this;
            this.data = new ArrayBuffer(x * y * z * DataType.BYTES_PER_ELEMENT);
            var finished = new Promise(resolve => {
                fetch(src).then((res) => {
                    if (res.ok) {
                        let currIndex = 0
                        var reader = res.body.getReader();
                        const processData = ({ done, value }) => {
                            
                            if (done) {
                                console.log("Stream complete");
                                return;
                            }
                            
                            new Uint8Array(that.data, currIndex, value.length).set(value);
    
                            currIndex += value.length;
                        
                            // Read some more, and call this function again
                            return reader.read().then(processData);
                        }
    
                        reader.read().then(processData).then(() => {
                            // convert to correct type
                            that.data = new DataType(that.data);
                            that.getLimits();
                            resolve(true);
                        });
                        that.initialise(x, y, z, ...this.cellSize);
                    } else {
                        console.log(res.status)
                        resolve(false);
                    }
                });
            });
    
            return finished;
        }
        this.fromVTSFile = function(src) {
            var that = this;
            that.structuredGrid = true;
            return fetch(src)
                .then(res => res.text())
                .then(text => parseXML(text))
                .then((fileDOM) => {
                    that.points = getPointsFromVTS(fileDOM, 0);
                    // get the first dataset
                    var pointDataNames = getDataNamesFromVTS(fileDOM, 0);
                    this.data = getPointDataFromVTS(fileDOM, 0, pointDataNames[0]);
                    // get the limtis for the dataset
                    this.limits = getDataLimitsFromVTS(fileDOM, 0, pointDataNames[0]);
                    console.log(this.limits);
                    that.initialiseVTS(...getExtentFromVTS(fileDOM, 0));
                });
        }
        this.setCellSize = function(size) {
            this.cellSize = size;
        };
        this.getLimits = function() {
            this.limits[undefined, undefined];
            for(let i = 0; i < this.data.length; i++) {
                let v = this.data[i];
                if (!this.limits[0] || v < this.limits[0]) {
                    this.limits[0] = v;
                } else if (!this.limits[1] || v > this.limits[1]) {
                    this.limits[1] = v;
                }
            }
            console.log(this.limits);
        }
        this.generateNormals = function() {
            if (!this.normalsInitialised) {
                this.normals = new Float32Array(this.volume * 3);
                this.normalsInitialised = true;
            }
            let n = vec3.create();
            for (let i = 0; i < this.size[0]; i++) {
                for (let j = 0; j < this.size[1]; j++) {
                    for (let k = 0; k < this.size[2]; k++) {
                        this.getDataPointNormal(i, j, k, n);
                        this.setNormal(i, j, k, n);
                    }
                }
            }
            this.normalsPopulated = true;
        };
        this.createComplex = async function(config) {
            // first, save the config object
            this.config = config;
            // assess what resolution the coarse representation should be
            // request the data at that resolution
            // for now, request the data at a fixed scale
            const scale = 2;
            
            const request = {
                name: config.name,
                mode: "whole",
                // will be determined by benchmarking
                cellScale: scale
            }

            // wait for the response
            const response = await fetch("/data", {
                method: "POST",
                body: JSON.stringify(request)
            });

            // get its array buffer
            var responseBuffer = await response.arrayBuffer();

            // create an array of correct type and store in this.data
            this.data = new DATA_TYPES[config.dataType](responseBuffer);

            // get the block limits data from the server
            var pathSplit = config.path.split(".");
            const limitsResponse = await fetch(pathSplit[0] + "_limits." + pathSplit[1]);
            const limitsBuffer = await limitsResponse.arrayBuffer();
            this.blockLimits = new DATA_TYPES[config.dataType](limitsBuffer)

            // console.log(this.blockLimits)

            this.blockLocations = new Int32Array(this.blockLimits.length/2);

            //console.log(this.blockLimits)
            this.blocksSize = [
                Math.floor(config.size.x/blockSize[0]),
                Math.floor(config.size.y/blockSize[1]),
                Math.floor(config.size.z/blockSize[2])
            ]

            this.limits = config.limits;
            console.log(this.limits)
            this.initialise(
                Math.floor(config.size.x/scale), 
                Math.floor(config.size.y/scale), 
                Math.floor(config.size.z/scale),
                scale*config.cellSize.x,
                scale*config.cellSize.y,
                scale*config.cellSize.z,
            );

            this.complex = true;
        }

        // called to request and load fine data around the iosurface from the server
        this.getFineData = async function(threshold) {
            const request = {
                name: this.config.name,
                mode: "threshold",
                threshold: threshold
            }

            var that = this;
            
            // get the fine data from the server but don't await
            const fineData = fetch("/data", {
                method: "POST",
                body: JSON.stringify(request)
            }).then(response => 
                response.arrayBuffer().then(buffer => 
                    new DATA_TYPES[that.config.dataType](buffer)
                )
            )

            // entries in active blocks gives the id of the block in the same position in this.data
            this.activeBlocks = [];
            // block locations is a list of all blocks and where they are in this.data if they are there
            var l, r;
            for (let i = 0; i < this.blockLimits.length/2; i++) {
                l = this.blockLimits[2*i];
                r = this.blockLimits[2*i + 1];
                if (l <= threshold && r >= threshold) {
                    this.blockLocations[i] = this.activeBlocks.length;
                    this.activeBlocks.push(i);
                } else {
                    this.blockLocations[i] = -1;
                }
            }

            // now await if the query to the server has not completed yet
            this.fineData = await fineData;

            //this.checkFine()

            console.log(this.activeBlocks.length);
            console.log(this.fineData.length/64);
        }
        
        this.getFineDataBlocks = async function(threshold) {
            // entries in active blocks gives the id of the block in the same position in this.data
            this.activeBlocks = [];
            // block locations is a list of all blocks and where they are in this.data if they are there
            var l, r;
            for (let i = 0; i < this.blockLimits.length/2; i++) {
                l = this.blockLimits[2*i];
                r = this.blockLimits[2*i + 1];
                if (i == 16 + 24*8) console.log(l, r)
                if (l <= threshold && r >= threshold ) {
                    this.blockLocations[i] = this.activeBlocks.length;
                    this.activeBlocks.push(i);
                } else {
                    this.blockLocations[i] = -1;
                }
            }            
            this.fineData = await this.fetchBlocks(this.activeBlocks);
        }
        this.fetchBlocks = function(blocks) {
            const request = {
                name: this.config.name,
                mode: "blocks",
                blocks: this.activeBlocks
            }

            var that = this;

            return fetch("/data", {
                method: "POST",
                body: JSON.stringify(request)
            }).then(response => 
                response.arrayBuffer().then(buffer => 
                    new DATA_TYPES[that.config.dataType](buffer)
                )
            )
        }

        // only works with 4x4x4 and when resolution is 1
        this.fetchFineFromCoarse = function(blocks) {
            var out = new DATA_TYPES[this.config.dataType](blocks.length*64);
            var num = 0;
            let block_pos, i, j, k;
            for (let blockNum = 0; blockNum < blocks.length; blockNum++) {
                block_pos = getPos(blocks[blockNum], this.blocksSize);
                for (let i_l = 0; i_l < 4; i_l++) {
                    for (let j_l = 0; j_l < 4; j_l++) {
                        for (let k_l = 0; k_l < 4; k_l++) {
                            i = i_l + block_pos[0] * 4;
                            j = j_l + block_pos[1] * 4;
                            k = k_l + block_pos[2] * 4;
                            out[num] = this.index(i, j, k);
                            num += 1
                        }
                    }
                }
            }

            return out;
        }
        
        // returns normal vector that is not normalised
        // normalisation step is done by the fragment shader
        this.getDataPointNormal = function(i, j, k, n) {
            let dx, dy, dz;
            const thisVal = this.index(i, j, k);
            // x(i) component
            if (i > 0) {
                if (i < this.size[0] - 2){
                    dx = (this.index(i+1, j, k) - this.index(i-1, j, k))/(2*this.cellSize[0])
                } else {
                    dx = (thisVal - this.index(i-1, j, k))/this.cellSize[0]
                }
            } else {
                dx = ((this.index(i+1, j, k) - thisVal)/(this.cellSize[0]))
            }
            // y(j) component
            if (j > 0) {
                if (j < this.size[1] - 2){
                    dy = (this.index(i, j+1, k) - this.index(i, j-1, k))/(2*this.cellSize[1])
                } else {
                    dy = (thisVal - this.index(i, j-1, k))/this.cellSize[1]
                }
            } else {
                dy = ((this.index(i, j+1, k) - thisVal)/(this.cellSize[1]))
            }
            // z(k) component
            if (k > 0) {
                if (k < this.size[2] - 2){
                    dz = (this.index(i, j, k+1) - this.index(i, j, k-1))/(2*this.cellSize[2])
                } else {
                    dz = (thisVal - this.index(i, j, k-1))/this.cellSize[2]
                }
            } else {
                dz = ((this.index(i, j, k+1) - thisVal)/(this.cellSize[2]))
            }
            //console.log(VecMath.normalise([dx, dy, dz]));
            vec3.set(n, -dx, -dy, -dz);
            //vec3.normalize(n, n);
        };
        this.checkFine = async function() {
            var wrong = 0;
            var wrongCoords = {
                x: new Set(),
                y: new Set(),
                z: new Set()
            }
            var wrongBlocks = new Set;

            for (let b = 0; b < this.activeBlocks.length; b++) {
                let blockPos = [
                    Math.floor(this.activeBlocks[b]/(this.blocksSize[1]*this.blocksSize[2])), 
                    Math.floor((this.activeBlocks[b]/this.blocksSize[2])%this.blocksSize[1]), 
                    Math.floor(this.activeBlocks[b]%this.blocksSize[2])
                ];
                
                // var coarseBlock = [];
                // var fineBlock = [];
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        for (let k = 0; k < 4; k++) {
                            let x = blockPos[0]*4 + i;
                            let y = blockPos[1]*4 + j;
                            let z = blockPos[2]*4 + k;
                            var val = this.index(x, y, z);
                            var fineVal = this.fineData[b*64 + 16*i + 4*j + k]
                            
                            if (val != fineVal) {
                                // wrongCoords.x.add(i);
                                // wrongCoords.y.add(j);
                                // wrongCoords.z.add(k);
                                // wrongBlocks.add(this.activeBlocks[b]);
                                wrong++;
                            }
                            // coarseBlock.push(val);
                            // fineBlock.push(fineVal);
                        }
                    }
                }                
            }
            console.log("wrong values:", wrong);
            // console.log("wrong coords:", wrongCoords)
        }
    },
    deleteData: function(data) {
        delete this.datas[data.id];
    }
}

function getPos(i, size) {
    return [
        Math.floor(i/(size[1]*size[2])), 
        Math.floor(i/size[2])%size[1], 
        i%size[2]
    ];
}

function getIndex(x, y, z, size) {
    return x*size[1]*size[2] + y*size[2] + z;
}