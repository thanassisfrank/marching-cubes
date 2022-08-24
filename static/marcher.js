// marcher.js

// a marcher object handles the marching of a set of data
// has links to 1 data object and 1 tmesh object
// fundamentally converts data -> mesh

import { dataManager } from "./data.js";
import { meshManager } from "./mesh.js";
import { renderModes } from "./view.js";
import { newId, volume, getRangeDeltas, rangesOverlap } from "./utils.js";
import { maxBufferSize, setupMarchFine, march, marchFine, updateActiveBlocks, updateMarchFineData } from "./march.js";
import { buffersUpdateNeeded, updateMeshBuffers, deleteBuffers, renderView } from "./render.js";


export {marcherManager}

var marcherManager = {
    // # bytes that a marcher is allowed to store in its own memory
    // used for fine data
    storageBudget: 268435456, // 256 MB
    marchers: {},
    create: function(data) {
        const id = newId(this.marchers);
        var newMarcher = new this.Marcher(id, data);
        this.marchers[id] = newMarcher;
        return newMarcher;
    },
    addUser: function(marcher) {
        this.marchers[marcher.id].users++;
        return  this.marchers[marcher.id].users;
    },
    removeUser: function(marcher) {
        this.marchers[marcher.id].users--;
        if (this.marchers[marcher.id].users == 0) {
            // no users, cleanup the object
            this.delete(marcher)
        }
    },
    delete: function(marcher) {
        if (marcher.multiBlock) {
            for (let subMarcher of marcher.pieces) {
                this.removeUser(subMarcher);
            }
        }
        marcher.delete();
        delete this.marchers[marcher.id];
    },
    Marcher: function(id, data) {
        this.id = id;
        this.users = 0;
        // stores a reference to an instance of data object
        this.data = data;
        // flag for if the marcher is for a multiblock dataset and so is also multiblock
        this.multiBlock = false;

        this.mesh;

        this.dataType = data.dataType;
        this.pointsDataType = data.pointsDataType;

        // stores other marcher objects if data is multiblock
        this.pieces = [];

        // flag to tell if marching is currently going on
        this.busy = false;

        this.setupComplete;

        // does marching cubes using the connected dataset
        // a whole data pass will use the whole data/whole data buffers from the dataObj
        this.init = async function(data) {
            this.mesh = meshManager.createMesh();
            meshManager.addUser(this.mesh);
            dataManager.addUser(this.data);
            if (data.multiBlock) {
                this.multiBlock = true;
                for (let i = 0; i < data.pieces.length; i++) {
                    this.pieces.push(marcherManager.create(data.pieces[i]));
                    marcherManager.addUser(this.pieces[i]);
                }
            } else {
                if (!data.complex) return;

                // storage for the fine data (main storage)
                this.fineData;
                this.finePoints;
                this.limits = data.limits; // [min, max]
                this.blocksSize = data.blocksSize;
                this.blockVol = volume(data.blockSize);
                this.activeBlocks; // temp storage for pulling the immediately needed blocks through from server
                this.blockLocations;  // a directory of the blocks loaded into the marcher's store
                this.loadedRange = [null, null];
                this.emptyLocations = []; // list of all locations currently unoccupied or holding redundant data

                this.firstTime = true;

                
                // holds the data for marching the fine blocks
                this.marchData = {};

                // setup the fine marching for complex datasets
                await setupMarchFine(this);
                this.marchData.loadedRange = this.loadedRange;
                // the maximum number of blocks that can be loaded here
                const maxBytesPerBlock = Math.max(data.bytesPerBlockData(), data.bytesPerBlockPoints())
                this.blocksBudget = Math.min(Math.floor(marcherManager.storageBudget/maxBytesPerBlock), volume(data.blocksSize)*1.1);
                this.marchData.blocksBudget = Math.min(Math.floor(maxBufferSize/maxBytesPerBlock), volume(data.blocksSize))/2;
                console.log("march module budget:", this.marchData.blocksBudget);

                const maxFinePoints = marcherManager.storageBudget/this.dataType.BYTES_PER_ELEMENT
                this.fineData = new this.dataType(Math.min(maxFinePoints, data.fullVolume));
                console.log(maxFinePoints, data.fullVolume);

                console.log(this.fineData.length);
                this.emptyLocations = [];
                for (let i = 0; i < Math.floor(this.fineData.length/this.blockVol); i++) {
                    this.emptyLocations.push(i);
                }
                this.blockLocations = new Int32Array(volume(data.blocksSize));
                this.blockLocations.fill(-1);
            }
        }
        this.march = async function(threshold) {
            if (this.data.initialised && !this.busy){
                this.busy = true;
                if (this.multiBlock) {
                    for (let i = 0; i < this.pieces.length; i++) {
                        this.pieces[i].march(threshold);
                    }
                } else {
                    await march(this.data, this.mesh, threshold);
                } 
                if (buffersUpdateNeeded()) this.updateBuffers();
                this.busy = false;
            }
        }
        this.valueInMarchModule = function(val) {
            if (this.marchData.loadedRange) {
                if (val >= this.marchData.loadedRange[0] && val <= this.marchData.loadedRange[1]) {
                    return true;
                }
            }
            return false;
        }
        this.valueLoadedHere = function(val) {
            if (val >= this.marchData.loadedRange[0] && val <= this.loadedRange[1]) {
                return true;
            }
            return false;
        }
        // a fine marching pass will use the fine data that it manages
        this.marchFine = async function(threshold) {
            console.log(this.setupComplete);
            await this.setupComplete;
            if (this.data.initialised && !this.busy){
                if (this.data.complex) {
                    this.busy = true;
                    if (this.multiBlock) {
                        for (let i = 0; i < this.pieces.length; i++) {
                            this.pieces[i].marchFine(threshold);
                        }
                    } else {
                        // get the block numbers that are active
                        this.activeBlocks = this.data.queryBlocks([threshold, threshold]);
                        // transfer the active blocks # to the march module
                        await updateActiveBlocks(this);
                        // if this is the first time or if not in loaded range
                        console.log(this.firstTime);

                        if (this.firstTime || !rangesOverlap([threshold, threshold], this.marchData.loadedRange)) {
                            console.log("updating data stored")
                            // find what new ranges will fill both stores of data, starting from the active blocks
                            // main -> this  marchModule -> for march instance
                            // const newRanges = [[threshold, threshold], [threshold, threshold]];
                            // const newRanges = [[200, 200], [200, 200]];
                            const newRanges = this.expandToFill([threshold, threshold], this.activeBlocks.length);
                            console.log(newRanges);

                            // get the ids of blocks that need to be added/removed from data stored here
                            if (this.firstTime) {
                                await this.updateFineData(this.data.queryBlocks(newRanges.main), []);
                            } else {
                                const blockDeltaIDs = data.queryDeltaBlocks(this.loadedRange, newRanges.main);
                                // update the data stored here
                                await this.updateFineData(blockDeltaIDs.add, blockDeltaIDs.remove);
                            }
                            this.loadedRange = newRanges.main;
                            
                            // update data stored in march instance
                            const newMarchBlocks = await this.data.queryBlocks(newRanges.marchModule);
                            // work out what block Locations buffer should be
                            var marchBlockLocations = new Int32Array(this.blockLocations.length)
                            marchBlockLocations.fill(-1);
                            for (let i = 0; i < newMarchBlocks.length; i++) {
                                marchBlockLocations[newMarchBlocks[i]] = i;
                            }
                            await updateMarchFineData(this, this.getFineData(newMarchBlocks), marchBlockLocations);
                            //await updateMarchFineData(this, this.fineData, this.blockLocations);
                            this.marchData.loadedRange = newRanges.marchModule;

                            this.firstTime = false;
                        }

                        await marchFine(this, this.mesh, threshold);

                    };
                    if (buffersUpdateNeeded()) this.updateBuffers();
                    this.busy = false;
                }
            }
        }

        this.expandToFill = function(range, num) {
            // expand the number of blocks loaded in the march module

            var expandRangeToFill = (data, budgetCount, loadedCount, loadedRange) => {
                var getNextConst = (err) => {
                    const kp = 0.08;
                    const kd = 0.045;
                    const ki = 0.09;
                    const p = err[0];
                    const d = err[1] ? err[0] - err[1] : 0;
                    const i = err.reduce((p, c) => p + c);
                    //console.log("p:", p, "d:", d, "i:", i);
                    return kp*p + kd*d + ki*i;
                }
                var valRange = data.limits[1] - data.limits[0];
                var newLimits, rangeDelta, newBlocksCount;

                // set the target to be lower  so that convergence below the maximum is faster
                var targetBlocksCount = 0.95*budgetCount;
                // error - number of empty block spaces in the buffer
                // positve - more blocks can be added   negative - too many blocks
                var err = [(targetBlocksCount - loadedCount)/targetBlocksCount];
                
                do {
                    
                    // the range of values for the new blocks to load
                    rangeDelta = valRange*getNextConst(err);
                    newLimits = [
                        Math.max(loadedRange[0] - rangeDelta, data.limits[0]), 
                        Math.min(loadedRange[1] + rangeDelta, data.limits[1])
                    ];
                    //console.log(newLimits);
                    // total # of new blocks to add
                    newBlocksCount = 0;
                    // new blocks from left
                    newBlocksCount += data.queryBlocksCount([newLimits[0], loadedRange[0]], [false, true]);
                    // new blocks from right
                    newBlocksCount += data.queryBlocksCount([loadedRange[1], newLimits[1]], [true, false]);

                    // may want to bias this so that we tend towards a small positive value
                    err.unshift((targetBlocksCount - loadedCount - newBlocksCount)/targetBlocksCount);

                    //console.log(err[0]);

                    // keep going if less than 5% blocks empty and less than 20 passes have been done or if too many blocks are selected
                    
                } while ((err[0] > 0.05 && err.length < 20) || err[0] < -budgetCount/targetBlocksCount);

                return [newLimits, newBlocksCount];
            }

            // expand the range to fill the march module's storage
            const [newMarchDataRange, newMarchBlocksCount] = expandRangeToFill(
                this.data, 
                this.marchData.blocksBudget, 
                num, 
                range
            );
            
            // expand this range again to fill the marcher's memory
            const [newDataRange, newBlocksCount] = expandRangeToFill(
                this.data, 
                this.blocksBudget, 
                num + newMarchBlocksCount, 
                newMarchDataRange
            );

            return {
                main: newDataRange, 
                marchModule: newMarchDataRange
            };
        }
        // takes lists of block ids to add/remove and alters finedata to match
        this.updateFineData = async function(addBlockIDs, removeBlockIDs) {
            // var inBoth = 0;
            // for (let i = 0; i < addBlockIDs.length; i++) {
            //     for (let j = 0; j < removeBlockIDs.length; j++) {
            //         if (addBlockIDs[i] == removeBlockIDs[j]) inBoth++;
            //     }
            // }
            // console.log(inBoth, "in both");
            console.log(addBlockIDs.length, "blocks to home");
            console.log(removeBlockIDs.length, "blocks to remove");
            console.log(this.emptyLocations.length, "empty locations at start");
            var removed = 0;
            var added = 0;
            //fetch new block data
            var newBlockData =  await this.data.fetchBlocks(addBlockIDs);
            // replace the blocks now
            for (let i = 0; i < removeBlockIDs.length; i++) {
                const oldBlockLoc = this.blockLocations[removeBlockIDs[i]];
                // if this block is not actually stored, skip removing it
                if (this.blockLocations[removeBlockIDs[i]] == -1) continue

                // show that this removed block is no longer stored here
                this.blockLocations[removeBlockIDs[i]] = -1;

                if (i < addBlockIDs.length) {
                    // can replace this old block with a new one
                    // overwrite with new block
                    for (let j = 0; j < this.blockVol; j++) {
                        const blockData = newBlockData.slice(i*this.blockVol, (i+1)*this.blockVol);
                        this.fineData.set(blockData, oldBlockLoc*this.blockVol);
                    }
                    added++;
                } else {
                    this.emptyLocations.push(this.blockLocations[removeBlockIDs[i]]);
                }
                removed++;
            }
            
            // console.log(newBlockData);
            // add any extra new blocks
            for (let i = added; i < addBlockIDs.length; i++) {
                if (this.emptyLocations.length > 0) {
                    const newBlockLoc = this.emptyLocations.pop();
                    for (let j = 0; j < this.blockVol; j++) {
                        this.fineData[newBlockLoc*this.blockVol + j] = newBlockData[i*this.blockVol + j];
                        this.blockLocations[addBlockIDs[i]] = newBlockLoc;
                    }
                    added++;
                } else {
                    console.log(addBlockIDs.length - i, "blocks not homed");
                    break;
                }
            }
            // console.log(this.blockVol);
            // console.log(this.fineData);
            // console.log(this.blockLocations);
            console.log(added, "blocks added");
            console.log(removed, "blocks removed");
            console.log(this.emptyLocations.length, "empty locations at end");
        }
        // returns the data corresponding to the blocks input in same order as input
        this.getFineData = function(blocks) {
            var out = new this.fineData.constructor(blocks.length*this.blockVol);
            for (let i = 0; i < blocks.length; i++) {
                const blockLoc = this.blockLocations[blocks[i]]*this.blockVol;
                const blockData = this.fineData.slice(blockLoc, blockLoc + this.blockVol);
                out.set(blockData, i*this.blockVol);
            }
            // console.log(blocks);
            //console.log(out);
            return out;
        }
        this.transferPointsToMesh = function() {
            if (this.multiBlock) {
                for (let i = 0; i < this.pieces.length; i++) {
                    this.pieces[i].transferPointsToMesh();
                }
                
            } else {
                if (data.structuredGrid) {
                    this.mesh.verts = this.data.points;
                } else {
                    this.mesh.verts = new Float32Array(this.data.volume*3);
                    var index = 0;
                    for (let i = 0; i < this.data.size[0]; i++) {
                        for (let j = 0; j < this.data.size[1]; j++) {
                            for (let k = 0; k < this.data.size[2]; k++) {
                                this.mesh.verts[3*index + 0] = i;
                                this.mesh.verts[3*index + 1] = j;
                                this.mesh.verts[3*index + 2] = k;
                                index++;
                            }
                        }
                    }
                    console.log("made points");
                }
                this.mesh.normals = new Float32Array(this.data.volume*3);
                this.mesh.vertsNum = this.data.volume;
            }
            this.updateBuffers();
            
        }
        this.updateBuffers = function() {
            updateMeshBuffers(this.mesh);
        }
        this.getTotalVerts = function() {
            var total = 0;
            if (this.multiBlock) {
                for (let i = 0; i < this.pieces.length; i++) {
                    total += this.pieces[i].mesh.vertsNum;
                }
            } else {
                total += this.mesh.vertsNum;
            }
            return total;
        }
        this.renderMesh = function(gl, projMat, modelMat, box, mode) {
            var meshes = []
            if (this.multiBlock) {
                for (let i = 0; i < this.pieces.length; i++) {
                    meshes.push(this.pieces[i].mesh)
                }
            } else {
                meshes.push(this.mesh);
            }
            renderView(gl, projMat, modelMat, box, meshes, mode != renderModes.ISO_SURFACE);
        }

        this.delete = function() {
            meshManager.removeUser(this.mesh);
            dataManager.removeUser(this.data);
        };

        // call the init function
        var that = this;
        this.setupComplete = new Promise(
            async function(resolve, reject) {
                await that.init(data);
                resolve(true);
            }
        );
    }
}


// do we keep a fine and a coarse mesh around simultaneously?
// just one mesh for now


// flow for marching fine data:

// the threshold value is chosen                                             written
// check if the fine data at the threshold is loaded in march instance          x
// if not:
//      check if it is loaded in the [[fine data storage]]                      x
//      if not:
//          load the data at the threshold value from the server                x
// continue to march the data ####                                              x
//
// the [[fine data]] instance manage the data it contains so that
// when the march completes:
//      expand the data that is loaded in the march instance


// block memory management:

// need to remain within budget at all times
// budget for march instance can be ascertained at init
// budget for fine data shared among all of the fine data users
// always keep a track of the range/ranges of data loaded
//      in terms of threshold values
// assumes system block storage > march instance block storage

// to expand blocks stored:
// work from the threshold value always
// gradually increase the size of the range until the number of blocks fills the allocated memory
//      start by increasing range by small amount (~1% of total value range)
//      increase is symmetric either side of 
//      query datastructure so see how many blocks lie exclusively in this new range
//      gradually expand the search - the velocity (Δ window size) given by a pid loop
//      the amount of space left is input to pid
//      stop when total > allowed and use prev
//      also keep a track of when the range is 

// look for any intercept with the range that is currently stored
// can keep the blocks that are still part of this new range
// request the new blocks 
// can go through and for each block that is being removed, replace with another that is being added


// ISSUE:
// where to put the active blocks if not in memory?
// > perhaps could work out the whole of the new range and add in all data before marching?
//   then skip the expansion step afterwards


// simpler fine march process:

// threshold comes in
// expand in both to get the new range of data
// get block numbers of needed blocks
// fetch new blocks needed for here and insert/replace existing blocks
// 


// transferring fine data to GPU:
//
// the issue is can't just map any buffer
// > could create a buffer thats a copy of the finedata just for reading/writing
// > could use queue.writebuffer to transfer data and a read buffer to read data -> likely very slow
// > just create new one each time
//   > could only update all the data when the threshold value leaves the stored values



// bugs:
// over time blocks getting deleted? mem leak? - FIXED: need main mem > march mem, blocks added+removed NOT YET
// > no longer overlapping
// > at start is fine
// > change threshold to outside range -> still fine
// > change to get outside of range -> goes wrong
// > seems to be not removing blocks when it should and adding when not needed