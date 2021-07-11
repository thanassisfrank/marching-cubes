//camera.js

import {mat4} from "https://cdn.skypack.dev/gl-matrix";
import {toRads} from "./utils.js";

export {Camera};

function Camera() {
    this.th = 0;
    this.phi = 0;
    this.fov = 80;
    this.projMat;
    this.projMatValid = false;
    this.getProjMat = function() {
        if (!this.projMatValid) {
            let projMat = mat4.create();
            let lookMat = mat4.create();
        
            const eye = [
                this.dist*Math.sin(toRads(-this.th))*Math.cos(toRads(this.phi)), 
                -this.dist*Math.sin(toRads(this.phi)), 
                this.dist*Math.cos(toRads(-this.th))*Math.cos(toRads(this.phi))
            ]
            mat4.lookAt(lookMat, eye, [0, 0, 0], [0, 1, 0])
            
            const aspect = 1;
            const zNear = 0.1;
            const zFar = 100.0;
        
            mat4.perspective(projMat,toRads(this.fov),aspect,zNear,zFar);
            //mat4.ortho(projMat, -size, size, -size, size, -size, size);
            mat4.multiply(projMat, projMat, lookMat);

            this.projMat = projMat;
            this.projMatValid = true;
        };
    
        return this.projMat;
    }
    this.setDist = function(dist) {
        this.dist = dist;
        this.projMatValid = false;
    }
    this.setTh = function(th) {
        this.th = th;
        this.projMatValid = false;
    }
    this.setPhi = function(phi) {
        this.phi = phi;
        this.projMatValid = false;
    }
}