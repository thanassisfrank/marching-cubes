// main.js

import {get, create, setupCanvasDims, repositionCanvas, getFirstOfClass, toRads} from "./utils.js";
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

    document.body.onresize = function() {
        setupCanvasDims(canvas);
    }
    var waiting = false;
    document.body.onscroll = function() {
        if (!waiting) {
            waiting = true;
            setTimeout(() => {
                repositionCanvas(canvas);
                waiting = false;
            }, 50);
        }
    }

    var ctx = setupRenderer(canvas);

    var camera1 = new Camera();
    var data1 = new Data();
    var mesh1 = new Mesh();

    //data1.generateData(15, 15, 15, (i, j, k) => Math.cos(Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2) + Math.pow(k, 2))/4) + 1);
    data1.generateData(15, 15, 15, (i, j, k) => Math.sqrt(Math.pow(i-7, 2) + Math.pow(j-7, 2) + Math.pow(k-7, 2))/5 + Math.random()/7);
    //data1.generateData(20, 20, 20, (i, j, k) => Math.random());
    //data1.generateData(2, 2, 2, (i, j, k) => i + j + k);

    camera1.setDist(1.2*data1.maxSize);

    const viewId = view.createView({
        camera: camera1,
        data: data1,
        mesh: mesh1
    });

    // data2.generateData(15, 15, 15, (i, j, k) => Math.pow(Math.pow(i-7, 6) + Math.pow(j-7, 6) + Math.pow(k-7, 6), 1/8)/5);

    get("add-view").onclick = function() {
        view.createView({
            camera: camera1,
            data: data1,
            mesh: new Mesh()
        });
    }

    document.body.onkeypress = function(e) {
        switch (e.key) {
            case " ":
                //test the speed of mesh generation
                console.log("test start")
                const amount = 1000;
                const start = Date.now();
                let mesh;
                for (let i = 0; i < amount; i++) {
                    view.views[viewId].generateMesh();
                    //data.generateNormals();
                }
                const dt = Date.now()-start;
                console.log("Speed for " + view.views[viewId].mesh.verts.length + " verts: " + String(dt/amount) + "ms")
                //console.log("Speed for " + data.data.length + " points: " + String(dt/amount) + "ms")
                break;
            case "ArrowLeft":
                //delete last view
                break;
            case "ArrowRight":
                // add new view
                break;
        }
    }
    

    var renderLoop = () => {
        view.render(ctx);
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
}