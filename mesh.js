//mesh.js

export {Mesh};

function Mesh() {
    this.verts = [];
    this.indices = [];
    this.normals = [];
    this.clear = function() {
        this.verts = [];
        this.indices = [];
        this.normals = [];
    }
}