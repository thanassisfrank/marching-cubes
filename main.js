// main.js

import {get, setupCanvasDims, repositionCanvas} from "./utils.js";
import {setupWasm} from "./marchingWasm.js";
import {Data} from "./data.js";
import {Camera} from "./camera.js";
import {setupRenderer} from "./render.js";
import { Mesh } from "./mesh.js";
import { view } from "./view.js";

document.body.onload = main;

async function main() {
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

    var ctx = await setupRenderer(canvas);

    if (!ctx) return;

    var camera1 = new Camera();
    var data1 = new Data();
    var mesh1 = new Mesh();

    //data1.generateData(15, 15, 15, (i, j, k) => Math.cos(Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2) + Math.pow(k, 2))/4) + 1);
    //data1.generateData(15, 15, 15, (i, j, k) => Math.sqrt(Math.pow(i-7, 2) + Math.pow(j-7, 2) + Math.pow(k-7, 2))/5);
    //data1.generateData(20, 20, 20, (i, j, k) => 10*(Math.random()+k));
    //data1.generateData(4, 4, 4, (i, j, k) => i + j + k);
    //data1.generateData(20, 20, 10, (i, j, k) => k/10 + Math.random()/5);
    // data1.generateData(221, 221, 100, (i, j, k) => {
    //     const dist = Math.sqrt(Math.pow((i-110)/3, 2) + Math.pow((j-110)/3, 2));
    //     return k-Math.cos(dist/2)*0.5*k*Math.pow(1.03, -dist);
    // });

    //const success = await data1.fromFile("./data/silicium_98x34x34_uint8.raw", 34, 34, 98);
    //const success = await data1.fromFile("./data/lobster_301x324x56_uint8.raw", 56, 324, 301);
    const success = await data1.fromFile("./data/engine_256x256x128_uint8.raw", 128, 256, 256);

    await setupWasm(data1);

    camera1.setDist(1.2*data1.maxSize);

    const viewId = view.createView({
        camera: camera1,
        data: data1,
        mesh: mesh1
    });

    // data2.generateData(15, 15, 15, (i, j, k) => Math.pow(Math.pow(i-7, 6) + Math.pow(j-7, 6) + Math.pow(k-7, 6), 1/8)/5);

    // get("add-view").onclick = function() {
    //     view.createView({
    //         camera: camera1,
    //         data: data1,
    //         mesh: new Mesh()
    //     });
    // }

    document.body.onkeypress = function(e) {
        switch (e.key) {
            case " ":
                // //test the speed of mesh generation
                // console.log("test start")
                // const amount = 1000;
                // const start = Date.now();
                // let mesh;
                // for (let i = 0; i < amount; i++) {
                //     view.views[viewId].generateMesh();
                //     //data.generateNormals();
                // }
                // const dt = Date.now()-start;
                // console.log("Speed for " + view.views[viewId].mesh.verts.length + " verts: " + String(dt/amount) + "ms")
                // //console.log("Speed for " + data.data.length + " points: " + String(dt/amount) + "ms")

                console.log(view.views["0"].threshold);
                console.log(view.views["0"].mesh.verts.length);
                console.log(view.views["0"].mesh.normals.length);
                console.log(view.views["0"].mesh.normals.length);
                const ind = view.views["0"].mesh.indices;
                console.log(ind[ind.length-1])
                // for (let i = 1; i < 100; i++) {
                //     console.log(ind[ind.length-i])
                // }
                break;
        }
    }
    
    var renderLoop = () => {
        view.render(ctx);
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
}