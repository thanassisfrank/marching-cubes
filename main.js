// main.js

import {get, create, setupCanvasDims, getFirstOfClass, toRads} from "./utils.js";
import {Data} from "./data.js";
import {Camera} from "./camera.js";
import {mat4} from 'https://cdn.skypack.dev/gl-matrix';
import {VecMath} from "./VecMath.js";
import {generateMesh} from "./marching.js";
import {setupRenderer, createBuffers, updateBuffers, renderView} from "./webglRender.js";
import { Mesh } from "./mesh.js";
import { view } from "./view.js";

document.body.onload = main;

function main() {
    var canvas = get("c");
    setupCanvasDims(canvas);

    var ctx = setupRenderer(canvas);

    var camera1 = new Camera();
    var data1 = new Data();
    var mesh1 = new Mesh();

    //data1.generateData(15, 15, 15, (i, j, k) => Math.cos(Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2) + Math.pow(k, 2))/4) + 1);
    data1.generateData(15, 15, 15, (i, j, k) => Math.sqrt(Math.pow(i-7, 2) + Math.pow(j-7, 2) + Math.pow(k-7, 2))/5);
    //data1.generateData(20, 20, 20, (i, j, k) => Math.random());
    //data1.generateData(2, 2, 2, (i, j, k) => i + j + k);

    camera1.setDist(1.2*data1.maxSize);

    view.createView({
        camera: camera1,
        data: data1,
        mesh: mesh1
    });

    var camera2 = new Camera();
    var mesh2 = new Mesh();
    var data2 = new Data();
    data2.generateData(15, 15, 15, (i, j, k) => Math.pow(Math.pow(i-7, 4) + Math.pow(j-7, 4) + Math.pow(k-7, 4), 1/4)/5);

    view.createView({
        camera: camera1,
        data: data2,
        mesh: mesh2
    });

    
    /*
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
        } else if (e.code == "KeyD") {
            box.left += 2;
        }
    }
    */

    var renderLoop = () => {
        view.render(ctx);
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
}