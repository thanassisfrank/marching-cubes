// webglRender.js
// implements a 3d engine using the webgl api

import {getCtx, toRads} from "./utils.js";
import {mat4} from 'https://cdn.skypack.dev/gl-matrix';
export {setupRenderer, updateRendererState, renderFrame};

var vertShader;
var fragShader;
var buffers;
var indicesLength;
var shaderProgram;
var programInfo;

const vsSource = `
    attribute vec4 aVertexPosition;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying vec3 color;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        color = vec3(aVertexPosition.xyz);
    }
`;

const fsSource = `
    precision mediump float;

    varying vec3 color;

    void main() {
        gl_FragColor = vec4(color.z/5.0, 0.0, 0.0, 1.0);
    }
`;


var setupRenderer = function(canvas) {
    var gl = getCtx(canvas, "webgl");
    if (gl == null) {
        console.log("webgl not supported");
        return;
    }

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LESS);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);

    shaderProgram = initShaderProgram(gl, vsSource, fsSource)
    if (shaderProgram === null) {
        console.log("error when creating shaderProgram")
    }

    programInfo = {
        program: shaderProgram,
        attribLocations: {
          vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
          projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
          modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    buffers = initBuffers(gl);

    const numComponents = 3;  // pull out 2 values per iteration
    const type = gl.FLOAT;    // the data in the buffer is 32bit floats
    const normalize = false;  // don't normalize
    const stride = 0;         // how many bytes to get from one set of values to the next
    const offset = 0;         // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

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
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const indicesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

    return {
      position: positionBuffer,
      indices: indicesBuffer
    };
}

function updateRendererState(gl, mesh) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.verts), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
    indicesLength = mesh.indices.length;
}

var renderFrame = function(gl, projMat, modelMat) {         
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projMat
    );
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelMat
    );

    gl.drawElements(gl.TRIANGLES, indicesLength, gl.UNSIGNED_SHORT, 0);
}