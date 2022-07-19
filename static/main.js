// main.js

import {get, isVisible, show, hide, setupCanvasDims, repositionCanvas, parseXML} from "./utils.js";

import {dataManager} from "./data.js";
import {cameraManager} from "./camera.js";
import { meshManager } from "./mesh.js";
import { viewManager, renderModes } from "./view.js";
import { decompressB64Str, getNumPiecesFromVTS, getDataNamesFromVTS, getPointsFromVTS, getExtentFromVTS } from "./dataUnpacker.js";

import {setRenderModule, setupRenderer, resizeRenderingContext} from "./render.js";
import {setupMarchModule, setMarchModule, setupMarch} from "./march.js";

setMarchModule("gpu");
setRenderModule("gpu");

const functionalDatasets = {
    ripple: {
        name: "Ripple",
        size: {
            x:221,
            y:221,
            z:100,
        },
        cellSize: {
            x: 1,
            y: 1,
            z: 1
        },        
        f: (i, j, k) => {
            const dist = Math.sqrt(Math.pow((i-110)/3, 2) + Math.pow((j-110)/3, 2));
            return 250-(k-Math.cos(dist/2)*0.5*k*Math.pow(1.03, -dist));
        }
    }
}

document.body.onload = main;

async function main() {
    var canvas = get("c");
    setupCanvasDims(canvas);

    const datasets = await fetch("/datasets.json")
        .then((res) => res.json())
        .then(d => {return {...d, ...functionalDatasets}})

    await setupMarchModule();
    var ctx = await setupRenderer(canvas); 

    document.body.onresize = function() {
        setupCanvasDims(canvas);
        resizeRenderingContext(ctx)
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

    // setup the view creation window button
    get("add-view").onclick = function() {
        var addViewPopup = get("add-view-popup");
        if (isVisible(addViewPopup)) {
            hide(addViewPopup);
            get("add-view").innerText = "+";
        } else {
            show(addViewPopup);
            get("add-view").innerText = "X";
        }
        // populate options
        // populate
    }
    

    if (!ctx) return;

    var camera1 = cameraManager.createCamera();
    var mesh1 = meshManager.createMesh();

    var data1 = await dataManager.createData({...datasets.bluntfin_simple_comb, accessType:"complex"});
    console.log(data1);

    if (data1.multiBlock) {
        console.log("doing multi")
        var results = [];
        for (let i = 0; i < data1.pieces.length; i++) {
            results.push(setupMarch(data1.pieces[i]));
        }
        await Promise.all(results);
        
    } else {
        await setupMarch(data1);
    }
    

    //console.log(data1.maxSize);
    camera1.setDist(1.2*data1.maxSize);

    var view1 = viewManager.createView({
        camera: camera1,
        data: data1,
        meshes: [meshManager.createMesh(), meshManager.createMesh()],
        renderMode: renderModes.ISO_SURFACE
    });

    document.body.onkeydown = function(e) {
        switch (e.key) {
            case " ":
                console.table(view1.threshold);
                break;
            case "Alt":
                e.preventDefault();
                break;
        }
    }
    
    var renderLoop = () => {
        viewManager.render(ctx);
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
}