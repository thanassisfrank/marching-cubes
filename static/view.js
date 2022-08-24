// view.js
// handles the creation of view objects, their management and deletion

import { get, show, isVisible, toRads, newId, timer } from "./utils.js";
import { VecMath } from "./VecMath.js";
import {mat4} from 'https://cdn.skypack.dev/gl-matrix';

import { meshManager } from "./mesh.js";
import { cameraManager } from "./camera.js";
import { marcherManager } from "./marcher.js";

import {clearScreen, renderView} from "./render.js";

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
        // some linking is working
    
        //check to see if there is already the max amount of views
        if (!this.moreViewsAllowed()) {
            console.log("sorry, max views reached");
            return false;
        }
    
        // check if the mesh, data and camera objects are supplied
        var camera = config.camera;
        var data = config.data;

        var marcher = marcherManager.create(data); // FOR NOW CREATE NEW FOR EACH VIEW
        

        const modelMat = mat4.create();
        mat4.rotateX(modelMat, modelMat, toRads(-90));
        mat4.translate(modelMat, modelMat, VecMath.scalMult(-1, data.midPoint));

        camera.setModelMat(modelMat);
        camera.setProjMat();
        camera.setDist(1.5*data.maxSize*data.maxCellSize);

        // register a new user of the used objects
        cameraManager.addUser(camera);
        marcherManager.addUser(marcher);


        // generate id
        const id = newId(this.views);
        var newView = new this.View(id, camera, marcher, config.renderMode || renderModes.ISO_SURFACE, (data.limits[0] + data.limits[1])/2);
        this.createViewDOM(id, newView);
        this.views[id] = newView;
        return newView;
    },
    createViewDOM: function(id, view) {
        // clone the proto node
        var viewContainer = get("view-container-proto").cloneNode(true);
        viewContainer.id = id;

        var slider = viewContainer.getElementsByTagName("INPUT")[0];
        var frame = viewContainer.getElementsByTagName("DIV")[0];
        var closeBtn = viewContainer.getElementsByTagName("BUTTON")[0];

        slider.min = view.marcher.data.limits[0];//Math.max(view.data.limits[0], 0);
        slider.max = view.marcher.data.limits[1];
        slider.step = (view.marcher.data.limits[1] - view.marcher.data.limits[0]) / 200;

        slider.value = (view.marcher.data.limits[0] + view.marcher.data.limits[1]) / 2;

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
    View: function(id, camera, marcher, renderMode, threshold) {
        this.id = id;
        this.camera = camera;

        // handles both data and meshes
        this.marcher = marcher;

        this.threshold = threshold;
        this.renderMode = renderMode;
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
                this.marcher.transferPointsToMesh();
            } else if (this.renderMode == renderModes.ISO_SURFACE ||this.renderMode == renderModes.ISO_POINTS) {
                this.updateThreshold(this.threshold);
            }            
        }     
        this.updateThreshold = async function(val) {
            this.threshold = val;
            // only update the mesh if marching is needed
            if (this.renderMode == renderModes.DATA_POINTS) return;

            // stops the fine timer running if it is
            
            
            this.marcher.march(this.threshold);

            if (this.marcher.data.complex) {
                clearTimeout(this.fineTimer.timer);
                //console.log("deleted:", this.fineTimer.timer)

                var that = this;

                this.fineTimer.timer = setTimeout(() => {
                    that.marcher.marchFine(that.threshold);
                }, this.fineTimer.duration);
                //console.log("created:",this.fineTimer.timer)
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
            this.box.left = rect.left - canvasRect.left;// + window.scrollX;
            this.box.top = rect.top - canvasRect.top;
            this.box.right = window.innerWidth + canvasRect.left - rect.right;
            this.box.bottom = window.innerHeight + canvasRect.top - rect.bottom// - window.scrollY;
            this.box.width = rect.width;
            this.box.height = rect.width;

            return this.box;
        }
        this.render = function(gl) {
            this.marcher.renderMesh(gl, this.camera.projMat, this.camera.getModelViewMat(), this.getBox(), this.renderMode);
        }
        this.delete = function() {
            // remove dom
            this.getViewContainer().remove();
            // deregister from camera
            cameraManager.removeUser(this.camera);
            // deregister from marcher
            marcherManager.removeUser(this.marcher);
        }


        // call the init function
        this.init();
    }
}