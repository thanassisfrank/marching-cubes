// main.js

import {get, toRads} from "./utils.js";
import {Data} from "./data.js";
import {Camera} from "./camera.js";
import {mat4} from 'https://cdn.skypack.dev/gl-matrix';
import {VecMath} from "./VecMath.js";
import {generateMesh} from "./marching.js";
import {setupRenderer, updateRendererState, renderFrame} from "./webglRender.js";

document.body.onload = main;

function main() {

    var camera = new Camera();
    var data = new Data();

    data.generateData(15, 15, 15, (i, j, k) => Math.cos(Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2) + Math.pow(k, 2))/4) + 1);
    //data.generateData(15, 15, 15, (i, j, k) => Math.sqrt(Math.pow(i-7, 2) + Math.pow(j-7, 2) + Math.pow(k-7, 2))/5);
    //data.generateData(20, 20, 20, (i, j, k) => Math.random());
    //data.generateData(2, 2, 2, (i, j, k) => i + j + k);

    camera.setDist(1.2*data.maxSize);

    var canvas = get("c");
    var startTh = 0;
    var startPhi = 0;

    var mouseStart = undefined;
    var mouseDown = false
    canvas.onmousedown = function(e) {
        mouseStart = [e.clientX, e.clientY];
        startTh = camera.th;
        startPhi = camera.phi;
        mouseDown = true;
    }
    canvas.onmousemove = function(e) {
        if (mouseDown) {
            const diffX = e.clientX - mouseStart[0];
            const diffY = e.clientY - mouseStart[1];
            camera.setTh(startTh + diffX/4);
            camera.setPhi(Math.max(Math.min(startPhi - diffY/4, 90), -90));
        }
    }
    canvas.onmouseup = function(e) {
        mouseDown = false;
    };
    canvas.onwheel = function(e) {
        e.preventDefault();
        camera.setDist(Math.max(data.maxSize/100, camera.dist + (e.deltaY*data.maxSize)/1000));
    }

    var ctx = setupRenderer(canvas);
    
    var threshold = parseFloat(get("thresholdInput").value);
    var mesh = generateMesh(data, threshold);
    //console.log(mesh.normals)
    updateRendererState(ctx, mesh);
    
    get("thresholdInput").oninput = function() {
        threshold = parseFloat(this.value);
        mesh = generateMesh(data, threshold);
        updateRendererState(ctx, mesh);
    }

    document.body.onkeypress = function(e) {
        if (e.code == "Space") {
            //test the speed of mesh generation
            console.log("test start")
            const amount = 500;
            const start = Date.now();
            let mesh;
            for (let i = 0; i < amount; i++) {
                mesh = generateMesh(data, threshold);
                //data.generateNormals();
            }
            const dt = Date.now()-start;
            console.log("Speed for " + mesh.verts.length + " verts: " + String(dt/amount) + "ms")
            //console.log("Speed for " + data.data.length + " points: " + String(dt/amount) + "ms")
        }
    }

    // setup model matrix
    const modelMat = mat4.create();
    mat4.rotateX(modelMat, modelMat, toRads(-90));
    mat4.translate(modelMat, modelMat, VecMath.scalMult(-1, data.midPoint));

    var renderLoop = () => {
        renderFrame(ctx, camera.getProjMat(), modelMat);
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
}