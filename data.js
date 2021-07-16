// data.js
// handles the storing of the data object, normals etc

import {VecMath} from "./VecMath.js";
import {vec3} from "https://cdn.skypack.dev/gl-matrix";
export {Data};

function Data() {
    this.data = [];
    this.normals = [];
    this.normalsInitialised = false;
    this.normalsPopulated = false;
    this.maxSize = 0;
    this.volume = 0;
    this.midPoint = [];
    this.size = [];
    this.cellSize = [1, 1, 1];
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
    this.generateData = function(x, y, z, f) {
        this.normalsInitialised = false;
        this.normalsPopulated = false;
        this.volume = x * y * z;
        this.data = new Float32Array(this.volume);
        for (let i = 0; i < x; i++) {
            for (let j = 0; j < y; j++) {
                for (let k = 0; k < z; k++) {
                    // values are clamped to >= 0
                    this.data[i * y * z + j * z + k] = Math.max(0, f(i, j, k));
                }
            }
        }
        this.maxSize = Math.max(x, y, z);
        this.midPoint = [(x-1)/2, (y-1)/2, (z-1)/2];
        this.size = [x, y, z];
        return this.data;
    };
    this.setCellSize = function(size) {
        this.cellSize = size;
    };
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
        vec3.set(n, dx, dy, dz);
        //vec3.normalize(n, n);
    };
}