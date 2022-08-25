struct F32Buff {
    buffer : array<f32>,
};
struct U32Buff {
    buffer : array<u32>,
};
struct I32Buff {
    buffer : array<i32>,
};

@group(0) @binding(0) var fineDataStorage : storage_texture_3d<f32>;
@group(0) @binding(1) var newFineData : texture_3d<f32>;
@group(0) @binding(2) var<storage, read> addBlocks : U32Buff;
@group(0) @binding(3) var<storage, read> removeBlocks : U32Buff;
@group(0) @binding(4) var<storage, read_write> blockLocations : I32Buff;
@group(0) @binding(5) var<storage, read> emptyLocations : U32Buff;
@group(0) @binding(6) var<storage, read> locationsOccupied : U32Buff;


fn getIndex3d(x : u32, y : u32, z : u32, size : vec3<u32>) -> u32 {
    return size.y * size.z * x + size.z * y + z;
}

fn getVal(localIndex : u32, blockIndex : u32) -> f32 {
    // linear index of texel
    var i = blockIndex * {{WGVol}}u + localIndex;
    var coords = vec3<i32>(posFromIndex(i, vec3<u32>(textureDimensions(newFineData, 0).zyx)).zyx);
    return f32(textureLoad(
        newFineData,
        coords,
        0
    ).x);
}

fn writeVal(localIndex : u32, blockIndex : u32, val : f32) -> f32 {
    // linear index of texel
    var i = blockIndex * {{WGVol}}u + localIndex;
    var coords = vec3<i32>(posFromIndex(i, vec3<u32>(textureDimensions(fineDataStorage, 0).zyx)).zyx);
    textureStore(
        fineDataStorage,
        coords,
        vec4<f32>(val, 0, 0, 0)
    );
}

@compute @workgroup_size({{WGSizeX}}, {{WGSizeY}}, {{WGSizeZ}})
fn main(
    @builtin(global_invocation_id) id : vec3<u32>,
    @builtin(local_invocation_index) localIndex : u32,
    @builtin(workgroup_id) wgid : vec3<u32>,
    @builtin(num_workgroups) wgnum : vec3<u32>
) {  
    var WGSize = {{WGVol}}u;
    var globalIndex = getIndex3d(wgid.x, wgid.y, wgid.z, wgnum)*WGSize + localIndex;
    
    if (globalIndex < arrayLength(addBlocks.buffer) && globalIndex < arrayLength(removeBlocks.buffer)) {
        // swap a block
        var oldBlockLocation = blockLocations.buffer[removeBlocks.buffer[globalIndex]];
        blockLocations.buffer[removeBlocks.buffer[globalIndex]] = -1;
        // write the new block into this location now
        var i = 0u;
        loop {
            if (i == WGSize) {
                break;
            }
            writeVal(i, oldBlockLocation, getVal(i, globalIndex));
            continuing {
                i = i + 1u;
            }
        }
        blockLocations.buffer[addBlocks.buffer[globalIndex]] = oldBlockLocation;

    } else if (globalIndex < arrayLength(removeBlocks.buffer)) {
        // remove block
        var oldBlockLocation = removeBlocks.buffer[globalIndex];
        blockLocations.buffer[oldBlockLocation] = -1;
        locationsOccupied.buffer[oldBlockLocation] = 0;

    } else if (globalIndex < arrayLength(addBlocks.buffer)) {
        // add block
        var newBlockLocIndex = globalIndex - arrayLength(removeBlocks.buffer);
        var newBlockLocation = emptyLocations.buffer[newBlockLocIndex];
        // write the new block into this location now
        var i = 0u;
        loop {
            if (i == WGSize) {
                break;
            }
            writeVal(i, newBlockLocation, getVal(i, globalIndex));
            continuing {
                i = i + 1u;
            }
        }
        blockLocations.buffer[addBlocks.buffer[globalIndex]] = newBlockLocation;
        locationsOccupied.buffer[newBlockLocation] = 1;
    }
}