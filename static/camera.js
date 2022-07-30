//camera.js

import {mat4, vec3} from "https://cdn.skypack.dev/gl-matrix";
import {toRads, newId} from "./utils.js";
import { VecMath } from "./VecMath.js";

export {cameraManager};



var cameraManager = {
    cameras: {},
    createCamera: function() {
        const id = newId(this.cameras);
        var newCamera = new this.Camera(id)
        this.cameras[id] = newCamera;
        return newCamera;
    },
    addUser: function(camera) {
        this.cameras[camera.id].users++;
        return  this.cameras[camera.id].users;
    },
    removeUser: function(camera) {
        this.cameras[camera.id].users--;
        if (this.cameras[camera.id].users == 0) {
            // no users, cleanup the object
            this.deleteCamera(camera)
        }
    },
    Camera: function(id) {
        this.id = id;
        this.users = 0;
        // horizontal angle
        this.th = 0;
        // vertical angle
        this.phi = 0;
        this.fov = 80;
        this.modelMat;
        this.modelViewMat;
        this.projMat;
        this.modelViewMatValid = false;
        this.mouseStart = [0, 0, 0];
        this.startTh = 0;
        this.startPhi = 0;
        this.mouseDown = false;
        // the world position the camera is focussed on
        this.target = [0, 0, 0];
        this.startTarget = this.target;
        // tracks the current movement mode
        // can be : pan, orbit or undefined when not moving
        this.mode;
        this.setModelMat = function(mat) {
            this.modelMat = mat;
        }
        this.setProjMat = function() {
            let projMat = mat4.create();
            const aspect = 1;
            const zNear = 0.1;
            const zFar = 10000.0;
        
            mat4.perspective(projMat,toRads(this.fov),aspect,zNear,zFar);
            this.projMat = projMat;
        }
        this.getEyePos = function() {
            var vec = [0, 0, this.dist];
            vec3.rotateX(vec, vec, [0, 0, 0], toRads(this.phi));
            vec3.rotateY(vec, vec, [0, 0, 0], toRads(-this.th));
            vec = VecMath.vecAdd(this.target, vec);
            //console.log(vec)
            return vec;
            
        }
        this.getModelViewMat = function() {
            if (!this.modelViewMatValid) {
                this.modelViewMat = mat4.create();
                let viewMat = mat4.create();
            
                // calculate eye position in world space from distance and angle values
                
                mat4.lookAt(viewMat, this.getEyePos(), this.target, [0, 1, 0])
                
                mat4.multiply(this.modelViewMat, viewMat, this.modelMat);
    
                this.modelViewMatValid = true;
            };
        
            return this.modelViewMat;
        }
        this.setDist = function(dist) {
            this.dist = dist;
            this.modelViewMatValid = false;
        }
        this.addToDist = function(dist) {
            this.dist += dist;
            this.modelViewMatValid = false;
        }
        this.setTh = function(th) {
            this.th = th;
            this.modelViewMatValid = false;
        }
        this.addToTh = function(th) {
            this.th += th;
            this.modelViewMatValid = false;
        }
        this.setPhi = function(phi) {
            this.phi = phi;
            this.modelViewMatValid = false;
        }
        this.addToPhi = function(phi) {
            this.phi = Math.max(Math.min(this.phi + phi, 89), -89);
            this.modelViewMatValid = false;
        }
        this.startMove = function(x, y, z, mode) {
            this.mouseStart = [x, y, z];
            this.mouseDown = true;
            this.startTh = this.th;
            this.startPhi = this.phi;
            this.startTarget = this.target;
            this.mode = mode;
        }
        // x, y and z are change in mouse position
        this.move = function(x, y, z, mode) {
            if (this.mouseDown) {
                if (mode != this.mode) {
                    // the mode has been changed (pressed or released control)
                    // reset start position
                    this.startMove(x, y, z, mode);
                }
                const diffX = x;// - this.mouseStart[0];
                const diffY = y;// - this.mouseStart[1];
                const diffZ = z;// - this.mouseStart[2];
                if (mode == "pan" || mode == "dolly") {
                    var vec = [-diffX/10, diffY/10, diffZ/10];
                    vec3.rotateX(vec, vec, [0, 0, 0], toRads(this.phi));
                    vec3.rotateY(vec, vec, [0, 0, 0], toRads(-this.th));
                    this.addToTarget(vec);
                } else if (mode == "orbit") {
                    this.addToTh(diffX/4);
                    this.addToPhi(-diffY/4);
                }
            }
        }
        // translates the camera in the direction of vec
        // vec is relative to the camera's current facing direction
        this.setTarget = function(vec) {
            this.target = vec;
            this.modelViewMatValid = false;
        }
        this.addToTarget = function(vec) {
            this.target = VecMath.vecAdd(this.target, vec);
            this.modelViewMatValid = false;
        }
        this.endMove = function() {
            this.mouseDown = false;
            this.mode = undefined;
        }
        this.changeDist = function(d) {
            this.setDist(Math.max(0.1, this.dist + (d)/10));
        }
        this.centre = function() {
            this.endMove();
            this.target = [0, 0, 0];
            this.modelViewMatValid = false;
            this.endMove();
        }
    },
    deleteCamera: function(camera) {
        delete this.cameras[camera.id];
    }
}