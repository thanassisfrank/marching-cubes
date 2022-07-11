const http = require("http")
const fs = require("fs")

const staticDir = "";
const files = [
    {
        path: "index.html",
        encoding: "utf8",
        contentType: "text/html"
    },
    {
        path: "camera.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "canvasRender.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "data.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "main.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "marching.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "marchingWasm.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "mesh.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "utils.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "VecMath.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "view.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "webgl.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "webGPU.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "render.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "march.js",
        encoding: "utf8",
        contentType: "text/javascript"
    },
    {
        path: "src/test.wasm",
        encoding: null,
        contentType: "application/wasm"
    },
    {
        path: "data/silicium_98x34x34_uint8.raw",
        encoding: null,
        contentType: "application/octet-stream"
    },
    {
        path: "data/lobster_301x324x56_uint8.raw",
        encoding: null,
        contentType: "application/octet-stream"
    },
    {
        path: "data/engine_256x256x128_uint8.raw",
        encoding: null,
        contentType: "application/octet-stream"
    },
    {
        path: "data/tacc_turbulence_256x256x256_float32.raw",
        encoding: null,
        contentType: "application/octet-stream"
    },
    {
        path: "data/csafe_heptane_302x302x302_uint8.raw",
        encoding: null,
        contentType: "application/octet-stream"
    },
    {
        path: "data/magnetic_reconnection_512x512x512_float32.raw",
        encoding: null,
        contentType: "application/octet-stream"
    },
    {
        path: "data/neocortical_layer_1_axons_1464x1033x76_uint8.raw",
        encoding: null,
        contentType: "application/octet-stream"
    },
    {
        path: "march.wgsl",
        encoding: null,
        contentType: "application/javascript"
    },
    {
        path: "analysis.js",
        encoding: "utf8",
        contentType: "application/javascript"
    },

];

http.createServer((req, res) => {
    found = false
    for (let i = 0; i < files.length; i++) {
        if (files[i].path == req.url.substring(1).split("/").join("/")) {
            res.writeHead(200, {
				"Content-Type":files[i].contentType,
				"Access-Control-Allow-Origin": "https://upload.twitter.com"
				});
            fs.createReadStream(__dirname + staticDir + "/" + files[i].path, files[i].encoding).pipe(res);
            found = true;
            break;
        }
    }
    if (!found) {
        res.writeHead(404);
        res.end();
    };
    
}).listen(8080)

console.log("started")