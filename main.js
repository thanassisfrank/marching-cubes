// main.js

import {get, toRads} from "./utils.js";
import {mat4} from 'https://cdn.skypack.dev/gl-matrix';
import {generateMesh} from "./marching.js";
import {setupRenderer, updateRendererState, renderFrame} from "./webglRender.js";

document.body.onload = main;

var generateData = (x, y, z, f) => {
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
    return data
}

function getProjMat(th, phi, dist) {
    let projMat = mat4.create();
    let lookMat = mat4.create();

    const eye = [
        dist*Math.sin(toRads(-th))*Math.cos(toRads(phi)), 
        -dist*Math.sin(toRads(phi)), 
        dist*Math.cos(toRads(-th))*Math.cos(toRads(phi))
    ]
    mat4.lookAt(lookMat, eye, [0, 0, 0], [0, 1, 0])
    
    const fov = toRads(80);   // in radians
    const aspect = 1;
    const zNear = 0.1;
    const zFar = 100.0;

    mat4.perspective(projMat,fov,aspect,zNear,zFar);
    //mat4.ortho(projMat, -size, size, -size, size, -size, size);
    mat4.multiply(projMat, projMat, lookMat)

    return projMat;
}

function main() {
    //const data = generateData(15, 15, 15, (i, j, k) => Math.cos(Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2) + Math.pow(k, 2))/4) + 1);
    const data = generateData(15, 15, 15, (i, j, k) => Math.sqrt(Math.pow(i-7, 2) + Math.pow(j-7, 2) + Math.pow(k-7, 2))/5);
    //const data = generateData(2, 2, 2, (i, j, k) => Math.random());
    //const data = generateData(10, 10, 10, (i, j, k) => j+k);

    const dataSize = Math.max(data.length, data[0].length, data[0][0].length)
    var dist = 1.2*dataSize;

    var canvas = get("c");
    var th = 0;
    var startTh = 0;
    var phi = 0;
    var startPhi = 0;  
    var projMat = getProjMat(th, phi, dist);

    var mouseStart = undefined;
    var mouseDown = false
    canvas.onmousedown = function(e) {
        mouseStart = [e.clientX, e.clientY];
        startTh = th;
        startPhi = phi;
        mouseDown = true;
    }
    canvas.onmousemove = function(e) {
        if (mouseDown) {
            const diffX = e.clientX - mouseStart[0];
            const diffY = e.clientY - mouseStart[1];
            th = startTh + diffX/4;
            phi = Math.max(Math.min(startPhi - diffY/4, 90), -90);
            projMat = getProjMat(th, phi, dist);
        }
    }
    canvas.onmouseup = function(e) {
        mouseDown = false;
    };
    canvas.onwheel = function(e) {
        e.preventDefault();
        dist = Math.max(0, dist + (e.deltaY*dataSize)/1000);
        projMat = getProjMat(th, phi, dist);
    }

    var ctx = setupRenderer(canvas);

    var scale = parseFloat(get("scaleInput").value);
    
    get("scaleInput").oninput = function() {
        scale = parseFloat(this.value);
    }

    
    var threshold = parseFloat(get("thresholdInput").value);
    var mesh = generateMesh(data, threshold);
    updateRendererState(ctx, mesh);
    
    get("thresholdInput").oninput = function() {
        threshold = parseFloat(this.value);
        mesh = generateMesh(data, threshold);
        updateRendererState(ctx, mesh);
    }

    const modelMat = mat4.create();
    mat4.rotateX(modelMat, modelMat, toRads(-90));
    mat4.translate(modelMat, modelMat, [-(data.length-1)/2, -(data[0].length-1)/2, -(data[0][0].length-1)/2])

    var renderLoop = () => {
        renderFrame(ctx, projMat, modelMat);
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
    
}