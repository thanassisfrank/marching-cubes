// main.js

import {get, isVisible, show, hide, setupCanvasDims, repositionCanvas, parseXML, IntervalTree, timer} from "./utils.js";

import {dataManager} from "./data.js";
import {cameraManager} from "./camera.js";
import { meshManager } from "./mesh.js";
import { viewManager, renderModes } from "./view.js";

import {setRenderModule, setupRenderer, resizeRenderingContext, autoSetRenderModule} from "./render.js";
import {setupMarchModule, setMarchModule, setupMarch, autoSetMarchModule} from "./march.js";

autoSetMarchModule();
autoSetRenderModule();
// setMarchModule("gpu");
// setRenderModule("gpu");
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
                y: 30, // down cylinder axis
                r: 10, // outwards from centre
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
        var dataOptions = get("data-select");
        var cameraOptions = get("camera-select");
        var thresholdOptions = get("threshold-select");
        if (isVisible(addViewPopup)) {
            console.log("hiding...");
            hide(addViewPopup);
            get("add-view").innerText = "+";

            // remove all the options from within each
            while (dataOptions.firstChild) {
                dataOptions.removeChild(dataOptions.firstChild);
            }
            while (cameraOptions.firstChild) {
                cameraOptions.removeChild(cameraOptions.firstChild);
            }
            while (thresholdOptions.firstChild) {
                thresholdOptions.removeChild(thresholdOptions.firstChild);
            }

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

            // get the data from the datasets object
            var currentDatas = dataManager.datas;
            for (let id in datasets) {
                var elem = document.createElement("OPTION");
                if (dataManager.loaded.has(datasets[id].name)) {
                    for (let dataId in currentDatas) {
                        if (currentDatas[dataId].dataName == datasets[id].name) {
                            elem.value = dataId;
                            break;
                        }
                    }
                    elem.setAttribute("loaded", true);
                } else {
                    elem.value = id;
                    elem.setAttribute("loaded", false);
                }
                
                elem.innerText = datasets[id].name;
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

        var newData;

        if (selectedDataElem.getAttribute("loaded") == "false") {
            timer.start("setup data");
            newData = await dataManager.createData({
                ...datasets[selectedDataElem.value], 
                accessType:"whole"
            });

            if (newData.multiBlock) {
                var results = [];
                for (let i = 0; i < newData.pieces.length; i++) {
                    results.push(setupMarch(newData.pieces[i]));
                }
                await Promise.all(results);
                
            } else {
                await setupMarch(newData);
            }
            timer.stop("setup data", newData.data.length);
        } else {
            // is loaded already
            newData = dataManager.datas[selectedDataElem.value];
        }

        viewManager.createView({
            camera: cameraManager.createCamera(),
            data: newData,
            renderMode: renderModes.ISO_SURFACE
        });

        // hide the window
        if (isVisible(get("add-view-popup"))) get("add-view").click();
    }
    

    if (!ctx) return;

    var camera1 = cameraManager.createCamera();
    //var mesh1 = meshManager.createMesh();
    timer.start("setup data");
    var data1 = await dataManager.createData({...datasets.multicomb_simple, accessType:"whole"});
    //console.log(data1);

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
    timer.stop("setup data", data1.data.length);
    

    //console.log(data1.maxSize);
    camera1.setDist(1.2*data1.maxSize);

    var view1 = viewManager.createView({
        camera: camera1,
        data: data1,
        renderMode: renderModes.ISO_SURFACE
    });

    document.body.onkeydown = function(e) {
        switch (e.key) {
            case "a":
                timer.copySamples("march");
                console.log("copied", timer.times["march"].samples.length);
                break;
            case "b":
                timer.copySamples("render");
                console.log("copied", timer.times["render"].samples.length);
                break;
            case "c":
                console.log(meshManager.meshes);
                console.log(cameraManager.cameras);
                console.log(dataManager.datas);
                break;
            case "Alt":
                e.preventDefault();
                break;
        }
    }

    // var timeout = setTimeout(() => {
    //     var elem = document.getElementsByTagName("INPUT")[0]
    //     elem.setAttribute("value", elem.min + 0.1*(elem.max - elem.min));
    //     elem.oninput.apply(elem);
    // }, 3000);

    // interval tree test =============================================
    // var tree = new IntervalTree([0, 10]);
    // for (let i = 0; i < 20; i++) {
    //     const a = 10*Math.random();
    //     const b = 10*Math.random();
    //     if (a > b) {
    //         tree.insert([b, a], String.fromCharCode(i+65));
    //         console.log([b, a, String.fromCharCode(i+65)])
    //     } else {
    //         tree.insert([a, b], String.fromCharCode(i+65));
    //         console.log([a, b, String.fromCharCode(i+65)])
    //     }
    // }

    // console.log(tree.tree);
    // console.log(tree.queryVal(6));
    // ================================================================
    
    var renderLoop = () => {
        viewManager.render(ctx);
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
}