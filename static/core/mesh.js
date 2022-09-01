//mesh.js

import { newId } from "./utils.js";
import {deleteBuffers} from "./render.js";
export {meshManager};



var meshManager = {
    meshes: {},
    createMesh: function() {
        const id = newId(this.meshes);
        var newMesh = new this.Mesh(id)
        this.meshes[id] = newMesh;
        return newMesh;
    },
    addUser: function(mesh) {
        this.meshes[mesh.id].users++;
        return  this.meshes[mesh.id].users;
    },
    removeUser: function(mesh) {
        this.meshes[mesh.id].users--;
        if (this.meshes[mesh.id].users == 0) {
            // no users, cleanup the object
            this.deleteMesh(mesh)
        }
    },
    deleteMesh: function(mesh) {
        deleteBuffers(mesh);
        delete this.meshes[mesh.id];
    },
    Mesh: function(id) {
        this.id = id;
        this.verts = [];
        this.indices = [];
        this.normals = [];
        this.indicesNum = 0;
        this.vertsNum = 0;
        this.users = 0;
        this.forceCPUSide = false;
        this.marchNormals = false

        this.clear = function() {
            this.verts = [];
            this.indices = [];
            this.normals = [];
        };
        this.buffers = {};
    }
}