//mesh.js

import { newId } from "./utils.js";
export {meshManager};



var meshManager = {
    meshes: {},
    createMesh: function() {
        const id = newId(this.meshes);
        var newMesh = new this.Mesh(id)
        this.meshes[id] = newMesh;
        return newMesh;
    },
    deleteMesh: function(mesh) {
        delete this.meshes[mesh.id];
    },
    Mesh: function(id) {
        this.id = id;
        this.verts = [];
        this.indices = [];
        this.normals = [];
        this.indicesNum = 0;
        this.vertsNum = 0;
        this.clear = function() {
            this.verts = [];
            this.indices = [];
            this.normals = [];
        };
        this.buffers = {};
    }
}