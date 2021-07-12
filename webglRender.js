// webglRender.js
// implements a 3d engine using the webgl api

import {getCtx, toRads} from "./utils.js";
import {mat4} from 'https://cdn.skypack.dev/gl-matrix';
import {VecMath} from "./VecMath.js";
export {setupRenderer, updateRendererState, renderFrame, createBuffers, updateBuffers, renderView};

var gl;
var vertShader;
var fragShader;
var buffers = {};
var indicesLength;
var shaderProgram;
var programInfo;

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 vertNormal;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying vec3 normal;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        normal = vertNormal;
    }
`;

const fsSource = `
    precision mediump float;

    varying vec3 normal;

    vec3 light1 = normalize(vec3(0.0, 0.0, -1.0));
    //vec3 light2 = normalize(vec3(0.0, 0.0, 0.0));
    vec3 color = vec3(0.29, 0.54, 0.95);

    void main() {
        float light = max(dot(-normal, light1), 0.0) + 0.1;
        light *= 1.0;//sign(light);
        gl_FragColor = vec4(color*light, 1.0);
    }
`;


var setupRenderer = function(canvas) {
    gl = getCtx(canvas, "webgl");
    if (gl == null) {
        console.log("webgl not supported");
        return;
    }

    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LESS);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);

    shaderProgram = initShaderProgram(gl, vsSource, fsSource)
    if (shaderProgram === null) {
        console.log("error when creating shaderProgram")
    }

    programInfo = {
        program: shaderProgram,
        attribLocations: {
          position: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
          normal: gl.getAttribLocation(shaderProgram, "vertNormal")
        },
        uniformLocations: {
          projMat: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
          modelMat: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        },
    };

    gl.enableVertexAttribArray(programInfo.attribLocations.position);
	gl.enableVertexAttribArray(programInfo.attribLocations.normal);

    gl.useProgram(programInfo.program);  

    return gl;
}

var initShaderProgram = function(gl, vsSource, fsSource) {
    vertShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    fragShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

var loadShader = function(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
    
      return shader;
}

function initBuffers(gl) {
    return {
      position: gl.createBuffer(),
      indices: gl.createBuffer(),
      normals: gl.createBuffer()
    };
}

function updateRendererState(gl, mesh) {
    //console.log(buffers);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers["a"].position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.verts), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers["a"].normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers["a"].indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
    indicesLength = mesh.indices.length;
}

var renderFrame = function(gl, projMat, modelMat) {         
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers["a"].indices); 
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projMat,
        false,
        projMat
    );

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelMat,
        false,
        modelMat
    );

    gl.drawElements(gl.TRIANGLES, indicesLength, gl.UNSIGNED_SHORT, 0);
}

function getNewBufferId() {
    var id = Object.keys(buffers).length;
        while (buffers.hasOwnProperty(String(id))) {
            id++;
        };
        return String(id);
}

// for creating a set of buffers for a particular id
function createBuffers() {
    const id = getNewBufferId();
    buffers[id] =  {
      position: gl.createBuffer(),
      indices: gl.createBuffer(),
      normals: gl.createBuffer()
    };
    return id;
}

function updateBuffers(mesh, id) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[id].position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.verts), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[id].normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[id].indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function deleteBuffers(id) {
    delete buffers[id];
}

// for rendering a particular set of buffers associated with a view
var renderView = function(gl, projMat, modelMat, box, indicesNum, id) {
    if (!buffers[id]) return;
    gl.viewport(box.left, box.bottom, box.width, box.height);
    gl.scissor(box.left, box.bottom, box.width, box.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projMat,
        false,
        projMat
    );
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelMat,
        false,
        modelMat
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[id].position);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 3, gl.FLOAT, gl.FALSE, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[id].normals);
    gl.vertexAttribPointer(programInfo.attribLocations.normal, 3, gl.FLOAT, gl.FALSE, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[id].indices); 
      

    gl.drawElements(gl.TRIANGLES, indicesNum, gl.UNSIGNED_SHORT, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, null);
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}