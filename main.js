// main.js

import {get, setupCanvasDims, repositionCanvas} from "./utils.js";

import {dataManager} from "./data.js";
import {cameraManager} from "./camera.js";
import { meshManager } from "./mesh.js";
import { viewManager } from "./view.js";

import {setRenderModule, setupRenderer} from "./render.js";
import {setupMarchModule, setMarchModule, setupMarch} from "./march.js";

setMarchModule("gpu");
setRenderModule("gpu");

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


    await setupMarchModule();
    var ctx = await setupRenderer(canvas);

    if (!ctx) return;

    var camera1 = cameraManager.createCamera();
    var mesh1 = meshManager.createMesh();;

    var data1 = await dataManager.createData({
        x:128,
        y:256,
        z:256,
        src: "./data/engine_256x256x128_uint8.raw",
        dataType: Uint8Array
    });
    // var data1 = await dataManager.createData({
    //     x:221,
    //     y:221,
    //     z:100,
    //     f: (i, j, k) => {
    //         const dist = Math.sqrt(Math.pow((i-110)/3, 2) + Math.pow((j-110)/3, 2));
    //         return 250-(k-Math.cos(dist/2)*0.5*k*Math.pow(1.03, -dist));
    //     }
    // });

    //data1.generateData(15, 15, 15, (i, j, k) => Math.cos(Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2) + Math.pow(k, 2))/4) + 1);
    //data1.generateData(15, 15, 15, (i, j, k) => Math.sqrt(Math.pow(i-7, 2) + Math.pow(j-7, 2) + Math.pow(k-7, 2))*10);
    //data1.generateData(10, 100, 100, (i, j, k) => 10*(2*Math.random()+k));
    //data1.generateData(2, 2, 2, (i, j, k) => 10*Math.random());
    //data1.generateData(20, 20, 10, (i, j, k) => k/10 + Math.random()/5);
    // data1.generateData(221, 221, 100, (i, j, k) => {
    //     const dist = Math.sqrt(Math.pow((i-110)/3, 2) + Math.pow((j-110)/3, 2));
    //     return 250-(k-Math.cos(dist/2)*0.5*k*Math.pow(1.03, -dist));
    // });
    //data1.generateData(37, 37, 37, (i, j, k) => k*10);
    //data1.generateData(257, 257, 257, (i, j, k) => Math.sqrt(Math.pow(i-7, 2) + Math.pow(j-7, 2) + Math.pow(k-7, 2))*2);

    //const success = await data1.fromFile("./data/silicium_98x34x34_uint8.raw", Uint8Array, 34, 34, 98);
    //const success = await data1.fromFile("./data/lobster_301x324x56_uint8.raw", Uint8Array, 56, 324, 301);
    // const success = await data1.fromFile("./data/tacc_turbulence_256x256x256_float32.raw", Float32Array, 256, 256, 256);
    //const success = await data1.fromFile("./data/csafe_heptane_302x302x302_uint8.raw", Uint8Array, 302, 302, 302);
    //const success = await data1.fromFile("./data/neocortical_layer_1_axons_1464x1033x76_uint8.raw", Uint8Array, 76, 1033, 1464);
    //const success = await data1.fromFile("./data/magnetic_reconnection_512x512x512_float32.raw", Float32Array, 512, 512, 512);

    await setupMarch(data1);

    camera1.setDist(1.2*data1.maxSize);

    var view1 = viewManager.createView({
        camera: camera1,
        data: data1,
        mesh: mesh1
    });

    document.body.onkeypress = function(e) {
        switch (e.key) {
            case " ":
                console.table(viewManager.timeLogs);
                break;
        }
    }
    
    var renderLoop = () => {
        viewManager.render(ctx);
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
}