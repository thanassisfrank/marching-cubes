// data.js
// handles the storing of the data object, normals etc

import {VecMath} from "./VecMath.js";
import {vec3} from "https://cdn.skypack.dev/gl-matrix";
import { newId } from "./utils.js";
export {dataManager};

var dataManager = {
    datas: {},
    createData: async function(config){
        const id = newId(this.datas);
        var newData = new this.Data(id);
        if (config.src) {
            // create a new data object from a file
            await newData.fromFile(config.src, config.dataType, config.x, config.y, config.z)
        } else if (config.f) {
            //create data from the supplied function
            newData.generateData(config.x, config.y, config.z, config.f);
        }
        this.datas[id] = newData;

        return newData;
    },
    Data: function(id) {
        this.id = id;
        this.data = [];
        this.normals = [];
        this.normalsInitialised = false;
        this.normalsPopulated = false;
        this.maxSize = 0;
        this.volume = 0;
        this.midPoint = [];
        this.size = [];
        this.cellSize = [1, 1, 1];
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
        this.initialise = function(x, y, z) {
            this.normalsInitialised = false;
            this.normalsPopulated = false;
            this.volume = x * y * z;
            this.maxSize = Math.max(x, y, z);
            this.midPoint = [(x-1)/2, (y-1)/2, (z-1)/2];
            this.size = [x, y, z];
            this.cellsCount = (x-1)*(y-1)*(z-1);
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
            this.initialise(x, y, z);
        };
        this.fromFile = function(src, DataType, x, y, z) {
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
                        that.initialise(x, y, z);
                    } else {
                        console.log(res.status)
                        resolve(false);
                    }
                });
            });
    
            return finished;
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
    },
    deleteData: function(data) {
        delete this.datas[data.id];
    }
}