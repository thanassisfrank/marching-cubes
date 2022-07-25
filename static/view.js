// view.js
// handles the creation of view objects, their management and deletion

import { get, show, isVisible, toRads, newId, timer } from "./utils.js";
import { VecMath } from "./VecMath.js";
import {mat4} from 'https://cdn.skypack.dev/gl-matrix';

import { meshManager } from "./mesh.js";
import { cameraManager } from "./camera.js";

import {buffersUpdateNeeded, updateMeshBuffers, deleteBuffers, clearScreen, renderView} from "./render.js";

import { march, marchMulti, marchFine } from "./march.js";
import { dataManager } from "./data.js";

export {viewManager, renderModes};

const renderModes = {
    ISO_SURFACE: 1,
    DATA_POINTS: 2,
    ISO_POINTS: 3
}

var viewManager = {
    
    maxViews: 30,
    // an object to hold all views that have been created
    views: {},
    initialThreshold: 10,
    moreViewsAllowed: function() {
        return Object.keys(this.views).length < this.maxViews;
    },
    createView: function(config) {
        // check if it is going to be linked with another view object
        // check what type of linking is required
    
        // FOR INITIAL IMPLEMENTATION: no linking is supported
        // some linking is working
    
        //check to see if there is already the max amount of views
        if (!this.moreViewsAllowed()) return false;
    
        // check if the mesh, data and camera objects are supplied
        var camera = config.camera;// || new Camera();
        var meshes = config.meshes || [];
        var data = config.data;// || new Data();

        if (meshes.length < data.pieces.length) {
            const x = meshes.length;
            for (let i = x; i < data.pieces.length; i++) {
                meshes.push(meshManager.createMesh());
            }
        } else if (!data.multiBlock && meshes.length == 0) {
            meshes = [meshManager.createMesh()];
        }
        console.log(meshes);
        

        const modelMat = mat4.create();
        mat4.rotateX(modelMat, modelMat, toRads(-90));
        mat4.translate(modelMat, modelMat, VecMath.scalMult(-1, data.midPoint));

        camera.setModelMat(modelMat);
        camera.setProjMat();
        camera.setDist(1.5*data.maxSize*data.maxCellSize);

        // register a new user of the used objects
        for (let mesh of meshes) {
            meshManager.addUser(mesh);
        }
        cameraManager.addUser(camera);
        dataManager.addUser(data);


        // generate id
        const id = newId(this.views);
        var newView = new this.View(id, camera, data, meshes);
        this.createViewDOM(id, newView);
        this.views[id] = newView;
        newView.renderMode = config.renderMode || renderModes.ISO_SURFACE;
        newView.init();

        return newView;
    },
    createViewDOM: function(id, view) {
        // clone the proto node
        var viewContainer = get("view-container-proto").cloneNode(true);
        viewContainer.id = id;

        var slider = viewContainer.getElementsByTagName("INPUT")[0];
        var frame = viewContainer.getElementsByTagName("DIV")[0];
        var closeBtn = viewContainer.getElementsByTagName("BUTTON")[0];

        slider.min = view.data.limits[0];//Math.max(view.data.limits[0], 0);
        slider.max = view.data.limits[1];
        slider.step = (view.data.limits[1] - view.data.limits[0]) / 200;

        slider.value = (view.data.limits[0] + view.data.limits[1]) / 2;

        closeBtn.onclick = () => {
            this.deleteView(view);
        }

        // set event listeners for the elements
        const shiftFac = 0.5;
        frame.onmousedown = function(e) {
            if (frame.requestPointerLock) {
                frame.requestPointerLock();
            }
            if (e.ctrlKey) {
                // pan
                view.camera.startMove(e.movementX, e.movementY, 0, "pan");
            } else if (e.altKey) {
                // dolly forward/back
                view.camera.startMove(0, 0, e.movementY, "dolly");
            } else {
                // rotate
                view.camera.startMove(e.movementX, e.movementY, 0, "orbit");
            }
        };
        frame.onmousemove = function(e) {
            var x = e.movementX;
            var y = e.movementY;
            if (e.shiftKey) {
                x *= shiftFac;
                y *= shiftFac;
            }
            if (e.ctrlKey) {
                // pan
                view.camera.move(x, y, 0, "pan");
            } else if (e.altKey) {
                // dolly forward/back
                view.camera.move(0, 0, y, "dolly");
            } else {
                // rotate
                view.camera.move(x, y, 0, "orbit");
            }
        };
        frame.onmouseup = function(e) {
            if (document.exitPointerLock) {
                document.exitPointerLock();
            }
            view.camera.endMove();
        };
        frame.onmouseleave = function(e) {
            view.camera.endMove();
        };
        frame.onwheel = function(e) {
            e.preventDefault();
            view.camera.changeDist(e.deltaY);
        };
        slider.oninput = function() {
            view.updateThreshold(parseFloat(this.value));
        };


        // might want another event listener for when the frame element is moved or resized 
        // to update view.box

        get("view-container-container").appendChild(viewContainer);
        show(viewContainer);

    }, 
    deleteView: function(view) {
        // hide the window
        if (isVisible(get("add-view-popup"))) get("add-view").click();

        this.views?.[view.id].delete();

        delete this.views[view.id];
    },
    render: function(gl) {
        // clear the whole screen at the start
        clearScreen(gl);
        // call the render functions of all currently active views
        for (let key in this.views) {
            this.views[key].render(gl);
        }
        if (Object.keys(this.views).length == 0) {
            clearScreen(gl);
        }
    },
    timeLogs: [],
    View: function(id, camera, data, meshes) {
        this.id = id;
        this.bufferId;
        this.camera = camera;
        this.data = data;
        this.meshes = meshes;
        this.threshold = (this.data.limits[0] + this.data.limits[1])/2;
        this.updating = false;
        this.renderMode = renderModes.ISO_SURFACE;
        // holds a timer that waits for a little while after the threshold has stopped changing
        // then generates a fine mesh
        this.fineTimer = {
            // timer itself
            timer: undefined,
            // time to fire in ms
            duration: 1000
        }
        this.box = {};
        this.init = function() {
            // do the correct type of initialisation based upon the rendering mode
            if (this.renderMode == renderModes.DATA_POINTS) {
                // transfer the points from the data object to the mesh
                this.transferPointsToMesh();
                this.updateBuffers()
            } else if (this.renderMode == renderModes.ISO_SURFACE ||this.renderMode == renderModes.ISO_POINTS) {
                this.updateThreshold(this.threshold);
            }            
        }
        this.getTotalVerts = function() {
            return this.meshes.reduce((a,b) => a + b.vertsNum, 0);
        }
        this.updateThreshold = async function(val) {
            // only update the mesh if marching is needed
            if (this.renderMode == renderModes.DATA_POINTS) return;

            timer.start("march");
            // stops the fine timer running if it is
            clearTimeout(this.fineTimer.timer)
            if (this.data.initialised){
                if(!this.updating) {
                    this.updating = true;
                    this.threshold = val;
                    const t0 = performance.now();
                    await this.generateIsoMesh();
                    const time = performance.now()-t0;
                    if (buffersUpdateNeeded()) this.updateBuffers();
                    //view.timeLogs.push([this.mesh.verts.length/3 | this.mesh.vertNum, time]);
                    this.updating = false;
                };
            };
            timer.stop("march", this.getTotalVerts());
        }
        this.transferPointsToMesh = function() {
            if (this.data.multiBlock) {
                for (let i = 0; i < this.data.pieces.length; i++) {
                    this.meshes[i].verts = this.data.pieces[i].points;
                    this.meshes[i].normals = new Float32Array(this.data.pieces[i].volume*3);
                    this.meshes[i].vertsNum = this.data.pieces[i].volume;
                }
                
            } else {
                if (data.structuredGrid) {
                    this.meshes[0].verts = this.data.points;
                } else {
                    this.meshes[0].verts = new Float32Array(this.data.volume*3);
                    var index = 0;
                    for (let i = 0; i < this.data.size[0]; i++) {
                        for (let j = 0; j < this.data.size[1]; j++) {
                            for (let k = 0; k < this.data.size[2]; k++) {
                                this.meshes[0].verts[3*index + 0] = i;
                                this.meshes[0].verts[3*index + 1] = j;
                                this.meshes[0].verts[3*index + 2] = k;
                                index++;
                            }
                        }
                    }
                    console.log("made points");
                }
                this.meshes[0].normals = new Float32Array(this.data.volume*3);
                this.meshes[0].vertsNum = this.data.volume;
            }
            
        }
        this.generateIsoMesh = async function() {
            if (this.data.multiBlock) {
                // doesnt support fine meshes for now

                await marchMulti(this.data.pieces, this.meshes, this.threshold);
                
            } else {
                await march(this.data, this.meshes[0], this.threshold);
                //console.log(this.meshes[0]);

                if (this.data.complex) {
                    var that = this;
                    this.fineTimer.timer = setTimeout(async function() {
                        console.log("march fine")
                        await that.data.getFineDataBlocks(that.threshold);
                        await marchFine(that.data, that.meshes[0], that.threshold);
                    }, this.fineTimer.duration);
                };
            }         
        }
        this.updateBuffers = function() {
            // console.log("oob");
            for (let i = 0; i < this.meshes.length; i++) {
                updateMeshBuffers(this.meshes[i]);
            }
            
        }
        this.getFrameElem = function() {
            return get(this.id).children[0];
        }
        this.getViewContainer = function() {
            return get(this.id);
        }
        this.getBox = function() {
            // find the box corresponding to the associated frame element
            // the box is relative to the canvas element
            var rect = this.getFrameElem().getBoundingClientRect();
            var canvasRect = get("c").getBoundingClientRect();
            this.box.left = rect.left - canvasRect.left// + window.scrollX;
            this.box.top = rect.top - canvasRect.top;
            this.box.right = window.innerWidth + canvasRect.left - rect.right;
            this.box.bottom = window.innerHeight + canvasRect.top - rect.bottom// - window.scrollY;
            this.box.width = rect.width;
            this.box.height = rect.width;

            return this.box;
        }
        this.render = function(gl) {
            // call the function to render this view
            // find place for model mat
            // find place for indices length

            if (this.data.initialised) {
                if (this.renderMode == renderModes.ISO_SURFACE ) {
                    //console.log("iso");
                    renderView(gl, this.camera.projMat, this.camera.getModelViewMat(), this.getBox(), this.meshes, false);
                } else if (this.renderMode == renderModes.DATA_POINTS || this.renderMode == renderModes.ISO_POINTS) {
                    //console.log("points");
                    renderView(gl, this.camera.projMat, this.camera.getModelViewMat(), this.getBox(), this.meshes, true);
                }
            };
        }
        this.delete = function() {
            this.getViewContainer().remove();
            // unregister for objects
            for (let mesh of this.meshes) {
                meshManager.removeUser(mesh);
            }
            cameraManager.removeUser(camera);
            dataManager.removeUser(data);
        }
    }
}
