[[block]] struct Data {
    [[size(16)]] size : vec3<u32>;
    [[size(16)]] WGNum : vec3<u32>;
    [[size(16)]] cellSize : vec3<f32>;
    data : array<u32>;
};
[[block]] struct Vars {
    threshold : f32;
    currVert : atomic<u32>;
    currIndex : atomic<u32>;
    cellScale : u32;
};
[[block]] struct Tables {
    vertCoord : array<array<u32, 3>, 8>;
    edge : array<array<i32, 12>, 256>;
    edgeToVerts : array<array<i32, 2>, 12>;
    tri : array<array<i32, 15>, 256>;
};
[[block]] struct F32Buff {
    buffer : array<f32>;
};
[[block]] struct U32Buff {
    buffer : array<u32>;
};
[[block]] struct Atoms {
    vert : atomic<u32>;
    index : atomic<u32>;
};

[[group(0), binding(0)]] var<storage, read> d : Data;
[[group(0), binding(1)]] var<storage, read> tables : Tables;

[[group(1), binding(0)]] var<storage, read_write> vars : Vars;

[[group(2), binding(0)]] var<storage, read_write> verts : F32Buff;
[[group(2), binding(1)]] var<storage, read_write> normals : F32Buff;
[[group(2), binding(2)]] var<storage, read_write> indices : U32Buff;

[[group(3), binding(0)]] var<storage, read_write> WGVertOffsets : U32Buff;
[[group(3), binding(1)]] var<storage, read_write> WGIndexOffsets : U32Buff;

var<workgroup> localVertOffsets : array<u32, {{WGVol}}>;
var<workgroup> localIndexOffsets : array<u32, {{WGVol}}>;
var<workgroup> localVertOffsetsAtom : atomic<u32>;
var<workgroup> localIndexOffsetsAtom : atomic<u32>;

fn getIndex3d(x : u32, y : u32, z : u32, size : vec3<u32>) -> u32 {
    return size.y * size.z * x + size.z * y + z;
}

fn unpack(val: u32, i : u32, packing : u32) -> f32{
    if (packing == 4u){
        return unpack4x8unorm(val)[i];
    }
    return bitcast<f32>(val);
}

fn getVal(x : u32, y : u32, z : u32, packing : u32, cellScale : u32) -> f32 {
    var a = getIndex3d(x*cellScale, y*cellScale, z*cellScale, d.size);
    return unpack(d.data[a/packing], a%packing, packing);
}


[[stage(compute), workgroup_size({{WGSizeX}}, {{WGSizeY}}, {{WGSizeZ}})]]
fn main(
    [[builtin(global_invocation_id)]] id : vec3<u32>,
    [[builtin(local_invocation_index)]] localIndex : u32,
    [[builtin(workgroup_id)]] wgid : vec3<u32>
) {         
    
    var WGSize = {{WGVol}}u;
    
    var cellScale = vars.cellScale;
    var packing = {{packing}}u;
    var code = 0u;

    var vertNum : u32 = 0u;
    var indexNum : u32 = 0u;

    var gridNormals : array<array<f32, 3>, 8>;

    var thisVerts : array<f32, 36>;
    var thisNormals : array<f32, 36>;
    var thisIndices : array<u32, 15>;

    var globalIndex : u32 = getIndex3d(id.x, id.y, id.z, d.size);

    // if outside of data, return
    var cells : vec3<u32> = vec3<u32>(d.size.x - 1u, d.size.y - 1u, d.size.z - 1u);
    if (
        (id.x + 1u)*cellScale >= d.size.x ||
        (id.y + 1u)*cellScale >= d.size.y || 
        (id.z + 1u)*cellScale >= d.size.z
    ) {
        // code remains 0
        code = 0u;
    } else {
        // calculate the code   
        var coord : array<u32, 3>;
        var i = 0u;
        loop {
            if (i == 8u) {
                break;
            }
            // the coordinate of the vert being looked at
            coord = tables.vertCoord[i];
            var val : f32 = getVal(id.x + coord[0], id.y + coord[1], id.z + coord[2], packing, cellScale);
            if (val > vars.threshold) {
                code = code | (1u << i);
            }
            continuing {
                i = i + 1u;
            }
        }
    }

    
    if (code > 0u && code < 255u) {
        // get a code for the active vertices
        var edges : array<i32, 12> = tables.edge[code];
        var activeVerts = 0u;
        var i = 0u;
        loop {
            if (i == 12u || edges[i] == -1){
                break;
            }
            var c : array<i32, 2> = tables.edgeToVerts[edges[i]];
            activeVerts = activeVerts | 1u << u32(c[0]);
            activeVerts = activeVerts | 1u << u32(c[1]);
            continuing {
                i = i + 1u;
            }
        }
        // get grad of grid points
    
        
        // CHANGE TO INCLUDE CELLSIZE

        // i= 0u;
        // loop {
        //     if (i == 8u) {
        //         break;
        //     }
        //     if ((activeVerts & (1u << i)) == (1u << i)) {
        //         var a : array<u32, 3> = tables.vertCoord[i];
        //         var X = id.x + a[0];
        //         var Y = id.y + a[1];
        //         var Z = id.z + a[2];
        //         var thisVal = getVal(id.x + a[0], id.y + a[1], id.z + a[2], packing);

        //         // x(i) component
        //         if (X > 0u) {
        //             if (X < d.size[0] - 2u){
        //                 gridNormals[i][0] = -((getVal(X + 1u, Y, Z, packing) - getVal(X - 1u, Y, Z, packing))/2.0);
        //             } else {
        //                 gridNormals[i][0] = -(thisVal - getVal(X - 1u, Y, Z, packing));
        //             }
        //         } else {
        //             gridNormals[i][0] = -(getVal(X + 1u, Y, Z, packing) - thisVal);
        //         }

        //         // y(Y) component
        //         if (Y > 0u) {
        //             if (Y < d.size[1] - 2u){
        //                 gridNormals[i][1] = -((getVal(X, Y + 1u, Z, packing) - getVal(X, Y - 1u, Z, packing))/2.0);
        //             } else {
        //                 gridNormals[i][1] = -(thisVal - getVal(X, Y - 1u, Z, packing));
        //             }
        //         } else {
        //             gridNormals[i][1] = -(getVal(X, Y + 1u, Z, packing) - thisVal);
        //         }

        //         // z(Z) component
        //         if (Z > 0u) {
        //             if (Z < d.size[2] - 2u){
        //                 gridNormals[i][2] = -((getVal(X, Y, Z + 1u, packing) - getVal(X, Y, Z - 1u, packing))/2.0);
        //             } else {
        //                 gridNormals[i][2] = -(thisVal - getVal(X, Y, Z - 1u, packing));
        //             }
        //         } else {
        //             gridNormals[i][2] = -(getVal(X, Y, Z + 1u, packing) - thisVal);
        //         }
        //     }
        //     continuing {
        //         i = i + 1u;
        //     }
        // }
        // vertices will be produced

        // get vertices
        
        i = 0u;
        loop {
            if (i == 12u || edges[i] == -1) {
                break;
            }
            var c : array<i32, 2> = tables.edgeToVerts[edges[i]];
            var a : array<u32, 3> = tables.vertCoord[c[0]];
            var b : array<u32, 3> = tables.vertCoord[c[1]];
            var va : f32 = getVal(id.x + a[0], id.y + a[1], id.z + a[2], packing, cellScale);
            var vb : f32 = getVal(id.x + b[0], id.y + b[1], id.z + b[2], packing, cellScale);
            var fac : f32 = (vars.threshold - va)/(vb - va);
            // fill vertices
            thisVerts[3u*i + 0u] = (mix(f32(a[0]), f32(b[0]), fac) + f32(id.x)) * f32(cellScale) * d.cellSize.x;
            thisVerts[3u*i + 1u] = (mix(f32(a[1]), f32(b[1]), fac) + f32(id.y)) * f32(cellScale) * d.cellSize.y;
            thisVerts[3u*i + 2u] = (mix(f32(a[2]), f32(b[2]), fac) + f32(id.z)) * f32(cellScale) * d.cellSize.z;
            // fill normals
            // thisNormals[3u*i + 0u] = mix(gridNormals[c[0]][0], gridNormals[c[1]][0], fac);
            // thisNormals[3u*i + 1u] = mix(gridNormals[c[0]][1], gridNormals[c[1]][1], fac);
            // thisNormals[3u*i + 2u] = mix(gridNormals[c[0]][2], gridNormals[c[1]][2], fac);

            continuing {
                i = i + 1u;
            }
        }
        vertNum = i;

        // get count of indices
        i = 0u;
        loop {
            if (i == 15u || tables.tri[code][i] == -1) {
                break;
            }
            continuing {
                i = i + 1u;
            }
        }

        indexNum = i;

        localVertOffsets[localIndex] = vertNum;
        localIndexOffsets[localIndex] = indexNum;
    }

    // perform prefix sum of offsets for workgroup
    var halfl = WGSize/2u;
    var r = halfl;
    var offset = 1u;
    var left = 0u;
    var right = 0u;

    loop {
        if (r == 0u) {
            break;
        }
        workgroupBarrier();
        storageBarrier();
        if (localIndex < halfl) {
            // if in the first half, sort the vert counts
            if (localIndex < r) {
                left = offset * (2u * localIndex + 1u) - 1u;
                right = offset * (2u * localIndex + 2u) - 1u;
                localVertOffsets[right] = localVertOffsets[left] + localVertOffsets[right];
            }
        } else {
            if (localIndex - halfl < r) {
                left = offset * (2u * (localIndex - halfl) + 1u) - 1u;
                right = offset * (2u * (localIndex - halfl) + 2u) - 1u;
                localIndexOffsets[right] = localIndexOffsets[left] + localIndexOffsets[right];
            }
        }
        
        continuing {
            r = r >> 1u;
            offset = offset << 1u;
        }
    }

    workgroupBarrier();
    storageBarrier();
    var last = WGSize - 1u;
    if (localIndex == 0u) {
        localVertOffsets[last] = 0u;
        
    } elseif (localIndex == halfl) {
        localIndexOffsets[last] = 0u;
    }
    
    r = 1u;
    var t : u32;
    loop {
        if (r == WGSize) {
            break;
        }
        offset = offset >> 1u;
        workgroupBarrier();
        storageBarrier();
        if (localIndex < halfl) {
            if (localIndex < r) {
                left = offset * (2u * localIndex + 1u) - 1u;
                right = offset * (2u * localIndex + 2u) - 1u;
                t = localVertOffsets[left];
                localVertOffsets[left] = localVertOffsets[right];
                localVertOffsets[right] = localVertOffsets[right] + t;
            }
        } else {
            if (localIndex - halfl < r) {
                left = offset * (2u * (localIndex - halfl) + 1u) - 1u;
                right = offset * (2u * (localIndex - halfl) + 2u) - 1u;
                t = localIndexOffsets[left];
                localIndexOffsets[left] = localIndexOffsets[right];
                localIndexOffsets[right] = localIndexOffsets[right] + t;
            }
        }
        
        continuing {
            r = 2u * r;
        }
    }

    workgroupBarrier();
    storageBarrier();

    if (vertNum > 0u && indexNum > 0u) {
        //var vertOffset : u32 = WGVertOffsets.buffer[getIndex3d(wgid.x, wgid.y, wgid.z, d.WGNum)] + atomicAdd(&localVertOffsetsAtom, vertNum);
        var vertOffset : u32 = WGVertOffsets.buffer[getIndex3d(wgid.x, wgid.y, wgid.z, d.WGNum)] + localVertOffsets[localIndex];
        //var indexOffset : u32 = WGIndexOffsets.buffer[getIndex3d(wgid.x, wgid.y, wgid.z, d.WGNum)] + atomicAdd(&localIndexOffsetsAtom, indexNum);
        var indexOffset : u32 = WGIndexOffsets.buffer[getIndex3d(wgid.x, wgid.y, wgid.z, d.WGNum)] + localIndexOffsets[localIndex];

        var i = 0u;
        loop {
            if (i == vertNum*3u) {
                break;
            }
            verts.buffer[3u*(vertOffset) + i] = thisVerts[i];
            //normals.buffer[3u*(vertOffset) + i] = thisNormals[i];

            continuing {
                i = i + 1u;
            }
        }

        i = 0u;
        loop {
            if (i == indexNum) {
                break;
            }
            indices.buffer[indexOffset + i] = u32(tables.tri[code][i]) + vertOffset;//indexNum;//localIndexOffsets[localIndex] + i;//
            continuing {
                i = i + 1u;
            }
        }
    }
}