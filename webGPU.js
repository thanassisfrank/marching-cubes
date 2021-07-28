// webgpu.js
// handles the webgpu api
// generating mesh and rendering

export {setupRenderer, createBuffers, updateBuffers, renderView, deleteBuffers, clearScreen};

const shaderCode = `
    [[block]]
    struct Uniform {
        pMat : mat4x4<f32>;
        mvMat : mat4x4<f32>;
    };

    struct VertexOut {
        [[builtin(position)]] position : vec4<f32>;
        [[location(0)]] normal : vec3<f32>;
        [[location(1)]] eye : vec3<f32>;
    };

    struct Light {
        dir : vec3<f32>;
        color : vec3<f32>;
    };

    [[group(0), binding(0)]] var<uniform> u : Uniform;

    
    [[stage(vertex)]]
    fn vertex_main([[location(0)]] position: vec3<f32>,
                    [[location(1)]] normal: vec3<f32>) -> VertexOut
    {
        var out : VertexOut;
        var vert : vec4<f32> = u.mvMat * vec4<f32>(position, 1.0);
        
        out.position = u.pMat * vert;
        out.normal = normal;
        out.eye = -vec3<f32>(vert.xyz);

        return out;
    }

    [[stage(fragment)]]
    fn fragment_main(data: VertexOut) -> [[location(0)]] vec4<f32>
    {
        var light1 : Light;
        light1.dir = vec3<f32>(0.0, 0.0, -1.0);
        light1.color = vec3<f32>(1.0);

        let diffuseColor = vec3<f32>(0.1, 0.7, 0.6);
        let specularColor = vec3<f32>(1.0);
        let shininess : f32 = 150.0;

        var E = normalize(data.eye);
        var N = normalize(data.normal);
        
        var diffuseFac = max(dot(-N, light1.dir), 0.0);
        
        var diffuse : vec3<f32>;
        var specular : vec3<f32>;
        var ambient : vec3<f32> = diffuseColor*0.3;
        
        var reflected : vec3<f32>;

        if (diffuseFac > 0.0) {
            diffuse = diffuseColor*light1.color*diffuseFac;

            reflected = reflect(light1.dir, N);
            var specularFac : f32 = pow(max(dot(reflected, E), 0.0), shininess);
            specular = specularColor*light1.color*specularFac;
        }

        
        return vec4<f32>(diffuse + specular + ambient, 1.0);
    }          
`
function getNewBufferId() {
    var id = Object.keys(buffers).length;
        while (buffers.hasOwnProperty(String(id))) {
            id++;
        };
        return String(id);
}

const clearColor = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

const setCombinedVert = (buffView, pos, col) => {
    for (let i = 0; i < pos.length/3; i++) {
        buffView.set(pos.slice(i * 3, i * 3 + 3), i * 6);
        buffView.set(col.slice(i * 3, i * 3 + 3), i * 6 + 3);
    }
}


// webgpu objects
var adapter;
var device;
var renderPipeline;
var buffers = {};
var uniformBuffer;
var bindGroup;

var depthStencilTextureView;


async function setupRenderer(canvas) {
    if (!navigator.gpu) {
        console.error("webgpu is not supported")
        return;
    }
    console.log("webgpu is supported yay!");

    adapter = await navigator.gpu.requestAdapter();
    device = await adapter.requestDevice();

    var ctx = canvas.getContext("webgpu");

    // setup swapchain
    ctx.configure({
        device: device,
        format: 'bgra8unorm'
    });

    // compile shader code
    const shaderModule = device.createShaderModule({
        code: shaderCode
    });

    const vertexLayout = [
        {
            attributes: [{
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3'
            }],
            arrayStride: 12,
            stepMode: 'vertex'
        },
        {
            attributes: [{
                shaderLocation: 1,
                offset: 0,
                format: 'float32x3'
            }],
            arrayStride: 12,
            stepMode: 'vertex'
        }
    ];

    var bindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
            }
        }]
    });

    var pipelineLayout = device.createPipelineLayout({bindGroupLayouts: [bindGroupLayout]})
    
    // pipeline descriptor
    const pipelineDescriptor = {
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: 'vertex_main',
            buffers: vertexLayout
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fragment_main',
            targets: [{
                format: 'bgra8unorm'
            }]
        },
        primitive: {
            topology: 'triangle-list'
        },
        depthStencil: {
            format: 'depth32float',
            depthWriteEnabled : true,
            depthCompare: 'less'
        }
    };

    uniformBuffer = device.createBuffer({
        size: 16*2*Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // create the rendering pipeline
    renderPipeline = device.createRenderPipeline(pipelineDescriptor);

    bindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {
                buffer: uniformBuffer
            }
        }]
    });

    var depthStencilTexture = device.createTexture({
        size: {
          width: ctx.canvas.width,
          height: ctx.canvas.height,
          depth: 1
        },
        dimension: '2d',
        format: 'depth32float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    depthStencilTextureView = depthStencilTexture.createView();

    return ctx;
}

function createBuffers() {
    const id = getNewBufferId()
    buffers[id] = {
        vertex: {
            buffer: null,
            byteLength: 0
        },
        normal: {
            buffer: null,
            byteLength: 0
        },
        index: {
            buffer: null,
            byteLength: 0
        }
    }
    return id;
}

function createFilledBuffer(type, data, usage) {
    const byteLength = data.byteLength;
    var buffer = device.createBuffer({
        size: byteLength,
        usage: usage,
        mappedAtCreation: true
    });
    if (type == "f32") {
        new Float32Array(buffer.getMappedRange()).set(data);
    } else if (type == "u32") {
        new Uint32Array(buffer.getMappedRange()).set(data);
    }
    
    buffer.unmap();
    return buffer;
}

function updateBuffers(mesh, id) {
    destroyBuffer(buffers[id].vertex.buffer);
    buffers[id].vertex.buffer = createFilledBuffer("f32", mesh.verts, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);

    destroyBuffer(buffers[id].normal.buffer);
    buffers[id].normal.buffer = createFilledBuffer("f32", mesh.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);

    destroyBuffer(buffers[id].index.buffer);
    buffers[id].index.buffer = createFilledBuffer("u32", mesh.indices, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
}

function destroyBuffer(buffer) {
    if (buffer !== null) {
        buffer.destroy();
    }
}

function deleteBuffers(id) {
    buffers?.[id].vertex.buffer?.destroy();
    buffers?.[id].normal.buffer?.destroy();
    buffers?.[id].index.buffer?.destroy();
    delete buffers[id];
};

function clearScreen() {};

async function renderView(ctx, projMat, modelViewMat, box, indicesNum, id) {
    var commandEncoder = await device.createCommandEncoder();
    // provide details of load and store part of pass
    // here there is one color output that will be cleared on load

    const renderPassDescriptor = {
        colorAttachments: [{
            loadValue: clearColor,
            storeOp: "store",
            view: ctx.getCurrentTexture().createView()
        }],
        depthStencilAttachment: {
            depthLoadValue: 1.0,
            depthStoreOp: 'discard',
            stencilLoadValue: 0,
            stencilStoreOp: 'store',
            view: depthStencilTextureView
          }
    };

    // write uniforms to buffer
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([...projMat, ...modelViewMat]))
    
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setViewport(box.left, box.top, box.width, box.height, 0, 1);
    passEncoder.setScissorRect(box.left, box.top, box.width, box.height);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setIndexBuffer(buffers[id].index.buffer, "uint32");
    passEncoder.setVertexBuffer(0, buffers[id].vertex.buffer);
    passEncoder.setVertexBuffer(1, buffers[id].normal.buffer);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.drawIndexed(indicesNum);
    passEncoder.endPass();

    device.queue.submit([commandEncoder.finish()]);
}