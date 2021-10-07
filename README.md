# marching-cubes

The goal of this project is to create an interactive, web-based implementation of the marching cubes algorithm that is capable of displaying large datasets.

The client side functionality is written largely in **JavaScript**, suplemented with **HTML** and **CSS** for page structure and styling, as well as **C**, **GLSL** and **WGSL** for specialised portions.

The server side is written using python and requires the numpy module to function fully as well as the builtin HTTPServer module.

## Data Storage

All data is stored on the server as raw, uncompressed binary files. For each data-set, there are a few different files that are kept:
* **The data itself** - 

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

## Client Side

### index.html
The main webpage file.

