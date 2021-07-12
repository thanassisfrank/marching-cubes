//camera.js

import {mat4} from "https://cdn.skypack.dev/gl-matrix";
import {toRads} from "./utils.js";

export {Camera};

function Camera() {
    this.th = 0;
    this.phi = 0;
    this.fov = 80;
    this.modelMat;
    this.projMat;
    this.projMatValid = false;
    this.mouseStart = [0, 0];
    this.startTh = 0;
    this.startPhi = 0;
    this.mouseDown = false;
    this.setModelMat = function(mat) {
        this.modelMat = mat;
    }
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
    this.startMove = function(x, y) {
        this.mouseStart = [x, y];
        this.mouseDown = true;
        this.startTh = this.th;
        this.startPhi = this.phi;
    }
    this.move = function(x, y) {
        if (this.mouseDown) {
            const diffX = x - this.mouseStart[0];
            const diffY = y - this.mouseStart[1];
            this.setTh(this.startTh + diffX/4);
            this.setPhi(Math.max(Math.min(this.startPhi - diffY/4, 90), -90));
        }
    }
    this.endMove = function() {
        this.mouseDown = false;
    }
    this.changeDist = function(d) {
        this.setDist(Math.max(0.1, this.dist + (d)/100));
    }
}