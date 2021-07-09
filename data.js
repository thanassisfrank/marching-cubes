// data.js
// handles the storing of the data object, normals etc

export {Data};

function Data() {
    this.data = [];
    this.normals = [];
    this.maxSize = 0;
    this.midPoint = [];
    this.generateData = function(x, y, z, f) {
        var data = [];
        for (let i = 0; i < x; i++) {
            data[i] = [];
            for (let j = 0; j < y; j++) {
                data[i][j] = [];
                for (let k = 0; k < z; k++) {
                    data[i][j].push(f(i, j, k));
                }
            }
        }
        this.data = data;
        this.maxSize = Math.max(x, y, z);
        this.midPoint = [(x-1)/2, (y-1)/2, (z-1)/2]
        return this.data;
    }
}