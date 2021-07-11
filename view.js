// view.js
// handles the creation of view objects, their management and deletion

import { Camera } from "./camera.js";
import { Data } from "./data.js";
import { Mesh } from "./mesh.js";
import { get } from "./utils.js";

export {view};

var view = {
    maxViews: 10,

    // an object to hold all views that have been created
    views: {},
    moreViewsAllowed: function() {
        return views.keys.length < maxViews;
    },
    newId: function() {
        var id = this.views.keys.length;
        while (this.views.hasOwnProperty(String(id))) {
            id++;
        };
        return String(id);
    },
    createView: function(config) {
        // check if it is going to be linked with another view object
        // check what type of linking is required
    
        // FOR INITIAL IMPLEMENTATION: no linking is supported
    
        //check to see if there is already the max amount of views
        if (!this.moreViewsAllowed) return false;
    
        // check if the mesh, data and camera objects are supplied
        var camera = config.camera || new Camera();
        var mesh = config.mesh || new Mesh();
        var data = config.data || new Data();

        // create div element for frame
        // position and size correctly
        // create threshold slider

        // generate id
        const id = this.newId();
        this.views[id] = new this.View(id, camera, mesh, data);
    
    },    
    deleteView: function(id) {
        views?.[id].delete();
    },
    View: function(id, camera, data, mesh) {
        this.id = id;
        this.camera = camera;
        this.data = data;
        this.mesh = mesh;
        this.threshold = 0;
        this.render
        this.delete = function() {
            // delete associated buffers on gpu
            //    call renderer's delete associated buffers function
            // delete associated DOM elements
        }
    }
}
