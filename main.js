// main.js

document.body.onload = main;

var generateData = (x, y, z, f) => {
    var data = [];
    for (let i = 0; i < x; i++) {
        data[i] = [];
        for (let j = 0; j < y; j++) {
            data[i][j] = [];
            for (let k = 0; k < z; k++) {
                data[i][j].push(f(i, j, k));
            }
        }
    }
    return data
}

function main() {
    var canvas = get("c");
    var angle = 90;
    var startAngle = 0;

    var mouseStart = undefined;
    var mouseDown = false
    canvas.onmousedown = function(e) {
        mouseStart = [e.clientX, e.clientY];
        startAngle = angle;
        mouseDown = true;
    }
    canvas.onmousemove = function(e) {
        if (mouseDown) {
            var diff = e.clientX - mouseStart[0];
            angle = startAngle + diff/4;
        }
    }
    canvas.onmouseup = function(e) {
        mouseDown = false;
    };

    var scale = parseFloat(get("scaleInput").value);
    
    get("scaleInput").oninput = function() {
        scale = parseFloat(this.value);
    }

    const data = generateData(15, 15, 15, (i, j, k) => Math.cos(Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2) + Math.pow(k, 2))/4) + 1);
    //const data = generateData(15, 15, 15, (i, j, k) => Math.sqrt(Math.pow(i-7, 2) + Math.pow(j-7, 2) + Math.pow(k-7, 2))/5);
    //const data = generateData(2, 2, 2, (i, j, k) => Math.random());
    //const data = generateData(4, 4, 4, (i, j, k) => i + j + k);

    
    var threshold = parseFloat(get("thresholdInput").value);
    var mesh = generateMesh(data, threshold);
    //console.log(mesh)
    
    get("thresholdInput").oninput = function() {
        threshold = parseFloat(this.value);
        mesh = generateMesh(data, threshold);
    }

    //setup the renderer; returns the rendering context object
    var ctx = setupRenderer(canvas);

    if (!ctx) {
        return;
    }

    var params = {
        w: ctx.width,
        h: ctx.height,
        data: data,
    }

    var renderLoop = () => {
        renderFrame(ctx, mesh, angle, scale, threshold, params)
        requestAnimationFrame(renderLoop)
    };
    renderLoop();
    
}