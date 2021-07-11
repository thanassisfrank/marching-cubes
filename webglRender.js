// webglRender.js
// implements a 3d engine using the webgl api

import {getCtx, toRads} from "./utils.js";
import {mat4} from 'https://cdn.skypack.dev/gl-matrix';
import {VecMath} from "./VecMath.js";
export {setupRenderer, updateRendererState, renderFrame};

var vertShader;
var fragShader;
var buffers;
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

    vec3 light = normalize(vec3(0.0, 0.0, -1.0));
    vec3 color = vec3(0.29, 0.54, 0.95);

    void main() {
        float light = dot(-normal, light);
        light *= 1.0;//sign(light);
        gl_FragColor = vec4(color*light, 1.0);
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
    gl.enable(gl.SCISSOR_TEST);

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
          vertNormalLocation: gl.getAttribLocation(shaderProgram, "vertNormal")
        },
        uniformLocations: {
          projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
          modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    buffers = initBuffers(gl);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, gl.FALSE, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
    gl.vertexAttribPointer(programInfo.attribLocations.vertNormalLocation, 3, gl.FLOAT, gl.FALSE, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribLocations.vertNormalLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

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

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

    const indicesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return {
      position: positionBuffer,
      indices: indicesBuffer,
      normals: normalBuffer
    };
}

function updateRendererState(gl, mesh) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.verts), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
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

var renderView = function(gl, projMat, modelMat, box, buffersId) {
    gl.viewPort(box.left, box.top, box.width, box.height);
    gl.scissor(left, bottom, width, height);
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

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[buffersId].position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, gl.FALSE, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[buffersId].normal);
    gl.vertexAttribPointer(programInfo.attribLocations.vertNormalLocation, 3, gl.FLOAT, gl.FALSE, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[buffersId].indices);

    gl.drawElements(gl.TRIANGLES, indicesLength, gl.UNSIGNED_SHORT, 0);
}