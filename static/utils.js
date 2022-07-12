// utils.js

export {get, isVisible, hide, show, getCtx, create, setupCanvasDims, getFirstOfClass, repositionCanvas, sin30, cos30, toRads, unZipVerts, newId, stringFormat, dataTypes, clampBox};

var get = (id) => {
    return document.getElementById(id)
}

var isVisible = (elem) => {
    return getComputedStyle(elem).visibility == "visible";
}

var hide = (elem) => {
    elem.style.visibility = "hidden";
}

var show = (elem) => {
    elem.style.visibility = "visible";
}

var getCtx = (canvas, type) => {
    return canvas.getContext(type);
}

var create = (type) => {
    return document.createElement(type);
}

var setupCanvasDims = (canvas) => {
    let style = getComputedStyle(canvas)
    canvas.width = parseInt(style.getPropertyValue("width"));
    canvas.height = parseInt(style.getPropertyValue("height"));
}

var repositionCanvas = (canvas) => {
    canvas.style.top = window.scrollY + "px";
    //canvas.style.left = window.scrollX + "px";
    //console.log(window.scrollX)
}

var getFirstOfClass = (className) => {
    return document.getElementsByClassName(className)[0];
}

const sin30 = Math.sin(Math.PI/6);
const cos30 = Math.cos(Math.PI/6);

const isoMatrix = [[-cos30, cos30, 0 ],
                   [sin30,  sin30, -1],
				   [0,      0,     0 ]];

var toRads = (deg) => {
	return deg*Math.PI/180
};

// takes 1d array and its 3d dimensions and returns 3d array
var to3dArray = (a, d) => {
    let a3 = []
    for (let i = 0; i < d[0]; i++) {
        a3[i] = [];
        for (let j = 0; j < d[1]; j++) {
            a3[i][j] = [];
            for (let k = 0; k < d[2]; k++) {
                a3[i][j].push(f(i, j, k));
            }
        }
    }
    return a3
}

function unZipVerts(verts) {
    let vertsOut = [];
    for (let i = 0; i < verts.length; i++) {
        vertsOut.push(verts[i][0])
        vertsOut.push(verts[i][1])
        vertsOut.push(verts[i][2])
    }

    return vertsOut;
}

// return a new id that is not one of the 
var newId = (obj) => {
    var count = 0;
    let id;
    do {
        id = Math.round(Math.random()*512).toString(16);
        count++;
    } while (obj[id] && count < 1000);
    return id;
}

// replaces every {{key}} in s with replace[key]
function stringFormat(s, replace) {
    for (const key in replace) {
        s = s.replaceAll("{{"+key+"}}", replace[key])   
    }
    return s;
}

const dataTypes = {
    "uint8": Uint8Array,
    "float32": Float32Array
}

var clampBox = (box, clampBox) => {
    box.left = Math.max(0, Math.min(clampBox.width, box.left));
    box.top = Math.max(0, Math.min(clampBox.height, box.top));
    box.right = Math.max(0, Math.min(clampBox.width, box.right));
    box.bottom = Math.max(0, Math.min(clampBox.height, box.bottom));
    box.width = clampBox.width - box.left - box.right;
    box.height = clampBox.height - box.top - box.bottom;
}