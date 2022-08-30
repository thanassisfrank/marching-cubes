// canvasRender.js
// implements a basic 3d engine using the canvas2d api

import {getCtx, toRads} from "./utils.js";
import {VecMath} from "./VecMath.js";
import {mat4, vec4} from 'https://cdn.skypack.dev/gl-matrix';
export {setupRenderer, renderFrame};

console.log(vec4)

const worldScale = 20;
const camZ = 20;

// setup function called by main
var setupRenderer = (canvas) => {
    var ctx = getCtx(canvas, "2d");
    ctx.width = canvas.width;
    ctx.height = canvas.height;
    return ctx;
}

var projPoint = (mat, pos, scale, off, worldOff, mirrorAxes) => {
    const worldPos = VecMath.vecAdd(pos, worldOff || [0, 0, 0]);
    const proj =  VecMath.vecMult(mirrorAxes || [1, 1, 1], VecMath.scalMult(scale, VecMath.matrixVecMult(mat, worldPos)));
    return  VecMath.vecAdd(proj, off || [0, 0, 0]);
}

const renderDataPoints = function(ctx, data, threshold, scale, off, mat){// viewMat, worldOff) => {
    ctx.fillStyle = "black"
    let size = 0;
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            for (let k = 0; k < data[i][j].length; k++) {

                //const projPos = projPoint(viewMat, [i, j, k], worldScale, off, worldOff);
                let projPos = new Float32Array(4);
                vec4.transformMat4(projPos, [i, j, k, 1], mat)
                vec4.scale(projPos, projPos, 100);
                vec4.add(projPos, projPos, [...off, 0, 0])
                const size = (data[i][j][k] > threshold)*scale;//*data[i][j][k];
                ctx.fillRect(projPos[0]-size/2, projPos[1]-size/2, size, size)
            }
        }
    }
}

const renderMesh = (ctx, mesh, viewMat, scale, off, worldOff) => {
    const indLen = mesh.indices.length;
    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";
    if (indLen > 2) {
        for (let i = 0; i < mesh.indices.length; i += 3) {
            ctx.beginPath()

            const pos0 = projPoint(viewMat, mesh.verts[mesh.indices[i]], worldScale, off, worldOff);
            ctx.moveTo(pos0[0], pos0[1])
            const pos1 = projPoint(viewMat, mesh.verts[mesh.indices[i+1]], worldScale, off, worldOff);
            ctx.lineTo(pos1[0], pos1[1])
            const pos2 = projPoint(viewMat, mesh.verts[mesh.indices[i+2]], worldScale, off, worldOff);
            ctx.lineTo(pos2[0], pos2[1])

            ctx.fill();
            //ctx.stroke();
            //ctx.fillRect(projPos[0]-scale/2, projPos[1]-scale/2, scale, scale)
        }
    }
}

const renderAxes = (ctx, viewMat) => {
    const origin = [ctx.width/2, ctx.height/2, 0]
    const projPos = projPoint(viewMat, [1, 0, 0], origin);
    
    const xPos = projPoint(viewMat, [1, 0, 0], worldScale, origin);
    const yPos = projPoint(viewMat, [0, 1, 0], worldScale, origin);
    const zPos = projPoint(viewMat, [0, 0, 1], worldScale, origin);

    // x-axis
    ctx.strokeStyle = "red";
    ctx.beginPath()
    ctx.moveTo(origin[0], origin[1])
    ctx.lineTo(xPos[0], xPos[1])
    ctx.stroke()

    // y-axis
    ctx.strokeStyle = "green";
    ctx.beginPath()
    ctx.moveTo(origin[0], origin[1])
    ctx.lineTo(yPos[0], yPos[1])
    ctx.stroke()

    // z-axis
    ctx.strokeStyle = "blue";
    ctx.beginPath()
    ctx.moveTo(origin[0], origin[1])
    ctx.lineTo(zPos[0], zPos[1])
    ctx.stroke()
}

// the main function called by other modules, takes the data, mesh, camera angle etc and renders a frame using the ctx
var renderFrame = function(ctx, mesh, angle, scale, threshold, p, mat) {
    ctx.clearRect(0, 0, p.w, p.h);

    const worldOff = [-(p.data.length-1)/2, -(p.data[0].length-1)/2, -(p.data[0][0].length-1)/2]
    const off = [p.w/2, p.h/2, 0];
    //const viewMat = VecMath.getRotatedIso(angle);

    let viewMat = new Float32Array(16);
    mat4.rotateZ(viewMat, mat, toRads(angle));

    renderDataPoints(ctx, p.data, threshold, scale, off, viewMat);//, viewMat, worldOff);
    //renderMesh(ctx, mesh, viewMat, scale, off, worldOff)
    //renderAxes(ctx, viewMat);
}