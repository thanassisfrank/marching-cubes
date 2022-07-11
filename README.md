# marching-cubes

The goal of this project is to create an interactive, web-based implementation of the marching cubes algorithm that is capable of displaying large datasets.

The client side functionality is written largely in **JavaScript**, suplemented with **HTML** and **CSS** for page structure and styling, as well as **C**, **GLSL** and **WGSL** for specialised portions.

The server side is written using python and requires the numpy module to function fully as well as the builtin HTTPServer module.

## Data Storage

All data is stored on the server as raw, uncompressed binary files. For each data-set, there are a few different files that are kept:
* <mark>**The data itself** - 

## Server Side

The final server side program is written entirely in python with communication done over an http connection with the client. There is one python file that constitutes the server.

### app.py
The server program file.

All communications from this program are carried out over http and handled by an `HTTPServer` object which is created using the custom `requestHandler` class. The `requestHandler` class is where the methods for handling both GET and POST requests are implemented, as well as the functions they call depending on the contents of the request e.g. serving a file for GET or different methods of sending a subset of the data for POST.

GET requests are exclusively used to transfer static web files such as HTML, JS or WASM to the client in response to their url being requested

POST requests are exclusively used to request subsets of values from the data sets. POST expects a request body formatted as a JSON object and can serve data in three different ways:
* **Whole data query** - this is handled by `handleWholeDataRequest` and will send data from the whole dataset at the given resolution. For a given resolution number n, a jump of n is used between each sample point in all 3 dimensions, with this sampled data packaged as though it was continuous. 
* **Threshold data query** - this is handled by `handleThresholdDataRequest` and only responds with data around the supplied threshold value. Specifically, it will send any blocks of data that the threshold intersects directly with or that are needed to complete cells of neighbour blocks that the threshold intersects with. This pulls its data from the \*\_blocks.raw files.
*  **Blocks data query** - this is handled by `handleBlockDataRequest` and will send the data of the blocks that correspond the the ids in the request, preserving order. This also uses the \*\_blocks.raw files.


### app.js
Deprecated **JS** version of server program  

<br><br>

## Client Side
The client side is a webapp with functional elements predominatly written in **JS**. The program is modularised into several different files which are loaded using the module interface.

### index.html
The main webpage file, includes **CSS** for styling. The page always contains a single, viewport sized canvas for rendering all of the views onto


### <mark>main.js
The main **JS** file.

### <mark>utils.js

### VecMath.js
A simple library of vector functions. The glmatrix library has replaced this

### view.js
Handles the creation and management of view objects. Each view object is associated with one viewport on the screen and requires one `camera`, one `mesh` and one `data` object. It will also create its own DOM when created.  
Mouse movements are captured whilst the left button is held down and are sent to the camera object to move its position.  

* no modifiers -> orbit
* control held -> pan
* alt held -> dolly
* scroll -> change distance to target
* shift held -> faster camera

Each view also contains a slider for adjusting the current threshold value.

### <mark>data.js
Handles the creation and management of data objects. Each can be created from an exisiting dataset stored on the server or from a supplied function. This also handles the queries to the server for the data as well as coarse and fine data blocks when needed.

### <mark>mesh.js
Handles the creation and management of mesh objects. A mesh object holds the vertex, index and normal buffers that make up a, isosurface mesh that has been extracted at a particular threshold value. If these are stored on the CPU then there are arrays for this.  
If they are stored in the GPU as for webgpu, they are referenced using the mesh's `id`.

### <mark>camera.js
Handles the creation and management of camera objects. Each camera object keeps a track of the absolute position of a camera in world space, including its position, target position (which it will always look towards), fov and the matricies that correspond to its camera transform for rendering.


### march.js
Acts as a common interface to obtain a marched isosurface mesh from a dataset and a threshold value. Will automatically set the implementation used, tracked in `module` to webgpu if avaiable and wasm if not.
#### marching.js
Implements the marching cubes algorithm in **JS**. Deprecated.
#### marchingWasm.js
Implements the marching cubes algorithm by running compiled **WASM** code.


### render.js
Acts as a common interface to render the scene. Will automatically set the implementation used, tracked in `module` to webgpu if avaiable and webgl if not.
#### canvasRender.js
Implements the render functions using the canvas2d API. Deprecated.
#### webgl.js
Implements the render functions using the webgl API.

### <mark>webgpu.js
Implements the CPU side of both rendering the scene and extracting the isosurface using the webgpu API.

* **Rendering** - 
* **Marching** - 

