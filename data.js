// data.js
// handles the storing of the data object, normals etc

export {Data};

function Data() {
    this.data = [];
    this.normals = [];
    this.maxSize = 0;
    this.midPoint = [];
    this.size = [];
    this.cellSize = [1, 1, 1];
    this.index = function(i, j, k) {
        return this.data[i * this.size[1] * this.size[2] + j * this.size[2] + k];
    }
    this.generateDataOld = function(x, y, z, f) {
        var data = [];
        for (let i = 0; i < x; i++) {
            data[i] = [];
            for (let j = 0; j < y; j++) {
                data[i][j] = [];
                for (let k = 0; k < z; k++) {
                    // values are clamped to > 0
                    data[i][j].push(Math.max(0, f(i, j, k)));
                }
            }
        }
        this.data = data;
        this.maxSize = Math.max(x, y, z);
        this.midPoint = [(x-1)/2, (y-1)/2, (z-1)/2];
        this.size = [x, y, z];
        return this.data;
    };
    this.generateData = function(x, y, z, f) {
        this.data = new Float32Array(x * y * z);
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
}