// utils.js

export {get, getCtx, create, setupCanvasDims, getFirstOfClass, sin30, cos30, toRads, unZipVerts};

var get = (id) => {
    return document.getElementById(id)
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

