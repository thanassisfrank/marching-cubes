// bg0
// tables buffer (int32)

// bg1
// buffer containing list of active block ids (uint32)
// buffer containing the block data in the same order as the ids (depends)
//     also contains threshold vars buffer for threshold (float32)
//     also contains the dimensions of the block grid (vec3<u32>)
// buffer containing a list of the locations of all blocks in fine data (int32)

// bg2
// per-block vertex offsets (uint32)

// bg3
// per-block index offsets (uint32)

struct Tables {
    vertCoord : array<array<u32, 3>, 8>,
    edge : array<array<i32, 12>, 256>,
    edgeToVerts : array<array<i32, 2>, 12>,
    tri : array<array<i32, 15>, 256>,
    requiredNeighbours : array<array<i32, 7>, 8>,
};

struct Data {
    @size(4) threshold : f32,
    @size(12) blockOffset : u32,
    @size(16) blocksSize : vec3<u32>,
    data : array<u32>,
};

struct U32Buffer {
    buffer : array<u32>,
};

struct I32Buffer {
    buffer : array<i32>,
};

@group(0) @binding(0) var<storage, read> tables : Tables;

@group(1) @binding(0) var<storage, read> d : Data;
@group(1) @binding(1) var<storage, read> activeBlocks : U32Buffer;
@group(1) @binding(2) var<storage, read> locations : I32Buffer;

@group(2) @binding(0) var<storage, read_write> WGVertOffsets : U32Buffer;
@group(2) @binding(1) var<storage, read_write> WGIndexOffsets : U32Buffer;

// used to get the total #verts and #indices for this block
var<workgroup> localVertOffsets : array<u32, {{WGVol}}>;
var<workgroup> localIndexOffsets : array<u32, {{WGVol}}>;

// holds dimensions of WG
var<workgroup> WGSize : vec3<u32>;
var<workgroup> WGVol : u32;
// holds index (1d) of current WG
var<workgroup> WGIndex : u32;

// 5x5x5 grid to store all the data potentially needed to generate the cells
var<workgroup> blockData : array<array<array<f32, 5>, 5>, 5>;

// the grid of cells that will be marched
// starts as WGSize - 1 and expanded if neighbours on the right side exist
var<workgroup> cellsSize : vec3<u32>;

// keeps a track of which neighbour cells are present in the data
var<workgroup> neighboursPresent : array<bool, 8>;


fn getIndex(x : u32, y : u32, z : u32, size : vec3<u32>) -> u32 {
    return size.y * size.z * x + size.z * y + z;
}

// get index but takes vector position input
fn getIndexV(pos : vec3<u32>, size : vec3<u32>) -> u32 {
    return getIndex(pos.x, pos.y, pos.z, size);
}

fn unpack(val: u32, i : u32, packing : u32) -> f32{
    if (packing == 4u){
        return unpack4x8unorm(val)[i];
    }
    return bitcast<f32>(val);
}

// different from other getVal as x, y, z are local to block and uses
// the number of the current wg(block) too
fn getVal(x : u32, y : u32, z : u32, WGId : u32, packing : u32) -> f32 {
    var i = WGId * {{WGVol}}u + getIndex(x, y, z, WGSize);
    return unpack(d.data[i/packing], i%packing, packing);
}

fn posFromIndex(i : u32, size : vec3<u32>) -> vec3<u32> {
    return vec3<u32>(i/(size.y*size.z), (i/size.z)%size.y, i%size.z);
}


fn getVertCount(code : u32) -> u32 {
    var i = 0u;
    loop {
        if (i == 12u || tables.edge[code][i] == -1) {
            break;
        }
        i = i + 1u;
    }
    return i;
}
fn getIndexCount(code : u32) -> u32 {
    var i = 0u;
    loop {
        if (i == 15u || tables.tri[code][i] == -1) {
            break;
        }
        i = i + 1u;
    }
    return i;
}

// fn all(bools : vec3<bool>) -> bool {
//     return bools.x && bools.y && bools.z;
// }

fn cellPresent(neighbours : vec3<u32>) -> bool {
    if (all(neighbours == vec3<u32>(0u))) {
        return true;
    }
    var code = neighbours.z;
    code = code | (neighbours.y << 1u);
    code = code | (neighbours.x << 2u);

    var i = 0u;
    loop {
        if (i == 7u || tables.requiredNeighbours[code][i] == -1) {
            // checked though all required neighbours
            // if still in loop then it has passed
            break;
        }
        if (neighboursPresent[tables.requiredNeighbours[code][i]] == false) {
            return false;
        }

        continuing {i = i + 1u;}
    }
    return true;
}


@compute @workgroup_size({{WGSizeX}}, {{WGSizeY}}, {{WGSizeZ}})
fn main(
    @builtin(global_invocation_id) gid : vec3<u32>, 
    @builtin(local_invocation_id) lid : vec3<u32>,
    @builtin(local_invocation_index) localIndex : u32, 
    @builtin(workgroup_id) WGId : vec3<u32>
) {
    if (all(lid == vec3<u32>(0u))) {
        WGSize = vec3<u32>({{WGSizeX}}u, {{WGSizeY}}u, {{WGSizeZ}}u);
        WGVol = {{WGVol}}u;
        cellsSize = WGSize - vec3<u32>(1u);
        // max workgroups per dimension is 65535 so need to wrap 3d
        // coords to 1d if there is more than that
        WGIndex = WGId.x + d.blockOffset;
    }

    workgroupBarrier();

    var packing = {{packing}}u;

    // get the index in dataset and position of current block
    var thisIndex = activeBlocks.buffer[WGIndex];
    var thisBlockPos = posFromIndex(thisIndex, d.blocksSize);
    var thisBlockLoc = u32(locations.buffer[thisIndex]);

    // first load all the required data into workgroup memory ==============================================
    var val = getVal(lid.x, lid.y, lid.z, thisBlockLoc, packing);
    blockData[lid.x][lid.y][lid.z] = val;
    
    // a vector that describes on what sides this thread has neighbouring blocks (if they exist)
    // corner(fwd): (1, 1, 1), edge(fwd): (1, 1, 0), face(fwd): (1, 0, 0), body: (0, 0, 0,)
    var neighbours = vec3<u32>(max(vec3<i32>(0), vec3<i32>(lid) - vec3<i32>(WGSize) + vec3<i32>(2)));
    
    if (
        lid.x == WGSize.x - 1u || 
        lid.y == WGSize.y - 1u || 
        lid.z == WGSize.z - 1u
    ) {
        // the threads on the +ve faces of the block need to check is they have to
        // load data from the neighbouring block(s) on that side
        // the thread on the forward corner will load data from 7 adjacent blocks
        // the threads on the leading edges will load data from 3 adjacent blocks
        // the threads on the leading faces will load data from 1 adjacent block

        var neighbourConfigs = array<vec3<u32>, 8>(
            vec3<u32>(0u, 0u, 0u), // body point
            vec3<u32>(0u, 0u, 1u), // z+ face neighbour
            vec3<u32>(0u, 1u, 0u), // y+ face neighbour
            vec3<u32>(0u, 1u, 1u), // x+ edge neighbour
            vec3<u32>(1u, 0u, 0u), // x+ face neighbour
            vec3<u32>(1u, 0u, 1u), // y+ edge neighbour
            vec3<u32>(1u, 1u, 0u), // z+ edge neighbour
            vec3<u32>(1u, 1u, 1u)  // corner neighbour 
        );

        

        // check if the block's neighbours are loaded (or exist)
        // and make cellsSize the full size in that dimension if so
        // at the same time, load the data from the shared faces
        var i = 0u;
        loop {
            if (i == 8u) {break;};
            if (all(neighbours == neighbourConfigs[i])) {
                var neighbourPos = thisBlockPos + neighbours;
                if (all(neighbourPos < d.blocksSize)) {
                    //neighbour is within boundary
                    var neighbourIndex = getIndexV(neighbourPos, d.blocksSize);
                    if (locations.buffer[neighbourIndex] > -1) {
                        // the face neighbour is part of the loaded dataset
                        // now increment the correct dimenson of cellsSize
                        neighboursPresent[i] = true;
                        // if (neighbourConfigs[i].x == 1u) {cellsSize.x = WGSize.x;}
                        // else if (neighbourConfigs[i].y == 1u) {cellsSize.y = WGSize.y;}
                        // else if (neighbourConfigs[i].z == 1u) {cellsSize.z = WGSize.z;}
                    }
                }
            }
            continuing {i = i + 1u;}
        }

        // load extra data if it is allowed
        i = 1u;
        loop {
            if (i==8u) {break;}
            if (neighboursPresent[i]) {
                var allowed = true;
                var j = 0u;
                
                loop {
                    if (j==3u) {break;}
                    if (neighbourConfigs[i][j] == 1u && neighbours[j] == 0u) {
                        allowed = false;
                        break;
                    }
                    continuing{j=j+1u;}
                }
                if (allowed) {
                    var neighbourIndex = u32(locations.buffer[thisIndex + getIndexV(neighbourConfigs[i], d.blocksSize)]);
                    var src = lid*(vec3<u32>(1u) - neighbourConfigs[i]);
                    var dst = lid + neighbourConfigs[i];
                    blockData[dst.x][dst.y][dst.z] = getVal(src.x, src.y, src.z, neighbourIndex, packing);
                }
            }
            continuing{i=i+1u;}
        }
    }

    // now all data from external blocks has been loaded
    // synchronise threads
    workgroupBarrier();
    storageBarrier();



    // for each cell, enumerate #verts and #indices =======================================================

    // only works when = 1u for now
    var cellScale = 1u;

    var code = 0u;
    var thisVertCount = 0u;
    var thisIndexCount = 0u;
    
    if (cellPresent(neighbours)) {        
        var c : array<u32, 3>;
        var i = 0u;
        loop {
            if (i == 8u) {break;}

            // the coordinate of the vert being looked at
            c = tables.vertCoord[i];
            val = blockData[(lid.x + c[0])*cellScale][(lid.y + c[1])*cellScale][(lid.z + c[2])*cellScale];
            if (val > d.threshold) {
                code = code | (1u << i);
            }

            continuing {i = i + 1u;}
        }
        thisVertCount = getVertCount(code);
        thisIndexCount = getIndexCount(code);

    }

    localVertOffsets[localIndex] = thisVertCount;
    localIndexOffsets[localIndex] = thisIndexCount;

    var halfl = WGVol >> 1u;
    var r = halfl;
    var offset = 1u;
    var left = 0u;
    var right = 0u;

    loop {
        
        if (r == 0u) {
            break;
        }
        workgroupBarrier();
        
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
    if (localIndex == 0u) {
        WGVertOffsets.buffer[WGIndex] = localVertOffsets[WGVol - 1u];
    }
    if (localIndex == 1u) {
        WGIndexOffsets.buffer[WGIndex] = localIndexOffsets[WGVol - 1u];
    }

}
