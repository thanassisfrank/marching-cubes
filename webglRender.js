// webglRender.js
// implements a 3d engine using the webgl api

var vertShader;
var fragShader;
var shaderProgram;

const vsSource = `
    attribute vec4 aVertexPosition;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
  `;


var setupRenderer = function(canvas) {
    var gl = canvas.getContext("webgl");
    if (gl == null) {
        console.log("webgl not supported");
        return;
    }
    gl.clearColor(0., 0., 0., 1.);
    gl.clear(gl.COLOR_BUFFER_BIT);

    shaderProgram = initShaderProgram(gl, "./shaders/shader.vert", "./shaders/shader.frag")
    if (shaderProgram === null) {
        console.log("error when creating shaderProgram")
    }

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

var renderFrame = function(gl, mesh, angle, scale, threshold, p) {

}