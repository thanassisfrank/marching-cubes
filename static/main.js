// main.js

import {get, isVisible, show, hide, removeAllChildren, setupCanvasDims, repositionCanvas, parseXML, IntervalTree, OldIntervalTree, timer} from "./core/utils.js";

import {dataManager} from "./core/data.js";
import {cameraManager} from "./core/camera.js";
import { meshManager } from "./core/mesh.js";
import { marcherManager } from "./core/marcher.js";
import { viewManager, renderModes } from "./view.js";

import {setRenderModule, setupRenderer, resizeRenderingContext, autoSetRenderModule} from "./core/render.js";
import {setupMarchModule, setMarchModule, setupMarch, autoSetMarchModule} from "./core/march.js";

autoSetMarchModule();
autoSetRenderModule();

const BLOCKS = 10;
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
        type: "raw",       
        f: (i, j, k) => {
            const dist = Math.sqrt(Math.pow((i-110)/3, 2) + Math.pow((j-110)/3, 2));
            return 250-(k-Math.cos(dist/2)*0.5*k*Math.pow(1.03, -dist));
        }
    },
    cylinder: {
        name: "Generated Cylinder",
        type: "structuredGrid",
        blocks: BLOCKS,
        
        f: (block) => {
            let limits = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
            const size = {
                th: 60, // around cylinder
                y: 100, // down cylinder axis
                r: 60, // outwards from centre
            };
            // make list of positions
            var points = [];
            var data = [];
            let x, y, z, v;
            for (let i = 0; i < size.th/BLOCKS + 1; i++) {
                for (let j = 0; j < size.y; j++) {
                    for (let k = 0; k < size.r; k++) {
                        x = (k+3)*Math.sin(2*Math.PI * (i/size.th + block/BLOCKS));
                        y = (k+3)*Math.cos(2*Math.PI * (i/size.th + block/BLOCKS));
                        z = j;
                        v = k + 3*Math.cos(j/2);
                        points.push(x, y, z);
                        data.push(v);
                        limits[0] = Math.min(limits[0], v);
                        limits[1] = Math.max(limits[1], v);
                    }
                }
            }

            return {
                size: [size.th/BLOCKS + 1, size.y, size.r],
                data: Float32Array.from(data),
                points: Float32Array.from(points),
                limits: limits
            }

        }
    }
}

document.body.onload = main;

async function main() {
    var canvas = get("c");
    setupCanvasDims(canvas);

    const datasets = await fetch("/data/datasets.json")
        .then((res) => res.json())
        .then(d => {return {...d, ...functionalDatasets}});
    // setup data manager with these
    dataManager.setConfigSet(datasets);

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
        var dataOptions = get("data-select");
        var cameraOptions = get("camera-select");
        var thresholdOptions = get("threshold-select");

        if (isVisible(addViewPopup)) {
            // hide if its shown
            console.log("hiding...");
            hide(addViewPopup);
            get("add-view").innerText = "+";

            // remove all the options from within each
            removeAllChildren(dataOptions);
            removeAllChildren(cameraOptions);
            removeAllChildren(thresholdOptions);

        } else {
            console.log("showing...");
            get("add-view").innerText = "X";
            
            // pull the current options from the camera manager
            var currentCameras = cameraManager.cameras;
            for (let id in currentCameras) {
                var elem = document.createElement("OPTION");
                elem.value = id;
                elem.innerText = id;
                cameraOptions.appendChild(elem);
            }

            for (let id in dataManager.configSet) {
                var elem = document.createElement("OPTION");
                elem.value = id;                
                elem.innerText = dataManager.configSet[id].name;
                dataOptions.appendChild(elem);
            }
            
            show(addViewPopup);
        }
    }

    get("create-view-btn").onclick = async function() {
        var d = get("data-select");
        var c = get("camera-select");
        //var thresholdOptions = get("threshold-select");

        const selectedDataElem = d.options[d.selectedIndex];
        const selectedCameraElem = c.options[c.selectedIndex];

        var newData = await dataManager.getDataObj(selectedDataElem.value);

        viewManager.createView({
            camera: cameraManager.createCamera(),
            data: newData,
            renderMode: renderModes.ISO_SURFACE
        });

        // hide the window
        if (isVisible(get("add-view-popup"))) get("add-view").click();
    }

    if (!ctx) return;

    document.body.onkeydown = function(e) {
        switch (e.key) {
            case " ":
                timer.log();
                break;
            case "l":
                const requested = prompt("which event?");
                const num = timer.copySamples(requested);
                if (num) {
                    console.log("copied", timer.times[requested].samples.length);
                }
                break;
            case "a":
                timer.copySamples("march");
                console.log("copied", timer.times["march"].samples.length);
                break;
            case "b":
                timer.copySamples("render");
                console.log("copied", timer.times["render"].samples.length);
                break;
            case "c":
                console.log(viewManager.views);
                console.log(meshManager.meshes);
                console.log(cameraManager.cameras);
                console.log(marcherManager.marchers);
                console.log(dataManager.datas);
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