// utils.js

export var get = (id) => {
    return document.getElementById(id)
}

export var isVisible = (elem) => {
    return getComputedStyle(elem).display != "none";
}

export var hide = (elem) => {
    elem.style.display = "none";
}

export var show = (elem) => {
    elem.style.display = "initial";
}

export var getCtx = (canvas, type) => {
    return canvas.getContext(type);
}

export var create = (type) => {
    return document.createElement(type);
}

export var setupCanvasDims = (canvas) => {
    let style = getComputedStyle(canvas)
    canvas.width = parseInt(style.getPropertyValue("width"));
    canvas.height = parseInt(style.getPropertyValue("height"));
}

export var repositionCanvas = (canvas) => {
    canvas.style.top = window.scrollY + "px";
    //canvas.style.left = window.scrollX + "px";
    //console.log(window.scrollX)
}

export var getFirstOfClass = (className) => {
    return document.getElementsByClassName(className)[0];
}

export const sin30 = Math.sin(Math.PI/6);
export const cos30 = Math.cos(Math.PI/6);

export const isoMatrix = [[-cos30, cos30, 0 ],
                   [sin30,  sin30, -1],
				   [0,      0,     0 ]];

export var toRads = (deg) => {
	return deg*Math.PI/180
};

// takes 1d array and its 3d dimensions and returns 3d array
export var to3dArray = (a, d) => {
    let a3 = []
    for (let i = 0; i < d[0]; i++) {
        a3[i] = [];
        for (let j = 0; j < d[1]; j++) {
            a3[i][j] = [];
            for (let k = 0; k < d[2]; k++) {
                a3[i][j].push(f(i, j, k));
            }
        }
    }
    return a3
}

export function unZipVerts(verts) {
    let vertsOut = [];
    for (let i = 0; i < verts.length; i++) {
        vertsOut.push(verts[i][0])
        vertsOut.push(verts[i][1])
        vertsOut.push(verts[i][2])
    }

    return vertsOut;
}

// return a new id that is not one of the 
export var newId = (obj) => {
    var count = 0;
    let id;
    do {
        id = Math.round(Math.random()*512).toString(16);
        count++;
    } while (obj[id] && count < 1000);
    return id;
}

// replaces every {{key}} in s with replace[key]
export function stringFormat(s, replace) {
    for (const key in replace) {
        s = s.replaceAll("{{"+key+"}}", replace[key])   
    }
    return s;
}

export const DATA_TYPES = {
    "uint8": Uint8Array,
    "int32": Int32Array,
    "uint32": Uint32Array,
    "int64": BigInt64Array,
    "uint64": BigUint64Array,
    "float32": Float32Array
}

export var clampBox = (box, clampBox) => {
    box.left = Math.max(0, Math.min(clampBox.width, box.left));
    box.top = Math.max(0, Math.min(clampBox.height, box.top));
    box.right = Math.max(0, Math.min(clampBox.width, box.right));
    box.bottom = Math.max(0, Math.min(clampBox.height, box.bottom));
    box.width = clampBox.width - box.left - box.right;
    box.height = clampBox.height - box.top - box.bottom;
}

// turns file string into an xml dom
export var parseXML = (xmlStr) => {
    var parser = new DOMParser();
    return parser.parseFromString(xmlStr, "text/xml");
}

export var xyzToA = (obj) => {
    return [obj.x, obj.y, obj.z];
}

export var getXMLContent = (node) => {
    return node.firstChild.nodeValue;
}

const child = {
    LEFT: 0, 
    RIGHT: 1
}

// interval tree data structure
export function IntervalTree(range) {
    this.range = range;
    // the tree consists of connected nodes each of form
    // {
    //     parent: node            reference to its parent node
    //     childType: child enum   if this node is l or r child
    //     val: float              the value that all the ranges within contain
    //     al: [ranges]            the ranges sorted by ascending left value
    //     dr: [ranges]            the ranges sorted by descending right value
    //     left: node              the left child node
    //     right: node             the right child node
    // }
    this.tree = {
        parent: null,
        childType: null,
        val: (range[0] + range[1])/2,
        al: [],
        dr: [],
        left: null,
        right: null,
    };
    this.insert = function(range, data) {
        // start at root node
        // if val intersects the range
        //   sort into al and dr
        // else if val < left of range
        //   move to right child (create if you have to)
        // else
        //   move to left child (create if you have to)

        let currNode = this.tree;
        var inserted = false;
        while (!inserted) {
            const val = currNode.val;
            if (val > range[0] && val < range[1]) {
                // found correct node
                const payload = [range[0], range[1], data];
                // simple linear insertion for now
                // sort into al
                if (currNode.al.length == 0) {
                    currNode.al.push(payload);
                } else {
                    for (let i = 0; i < currNode.al.length; i++) {
                        if (currNode.al[i][0] > payload[0]) {
                            currNode.al.splice(i, 0, payload);
                            break;
                        } else if (i == currNode.al.length - 1) {
                            currNode.al.push(payload);
                            break;
                        }
                    }
                }
                // sort into dr
                if (currNode.dr.length == 0) {
                    currNode.dr.push(payload);
                } else {
                    for (let i = 0; i < currNode.dr.length; i++) {
                        if (currNode.dr[i][1] < payload[1]) {
                            currNode.dr.splice(i, 0, payload);
                            break;
                        } else if (i == currNode.dr.length - 1) {
                            currNode.dr.push(payload);
                            break;
                        }
                    }
                }
                inserted = true;
            } else if (val < range[0]) {
                // move to right child
                currNode = this.getOrCreateRightChild(currNode);
            } else {
                // move to left child
                currNode = this.getOrCreateLeftChild(currNode);
            }
        }
    }
    this.queryVal = function(qVal) {
        let out = [];
        let currNode = this.tree;
        var complete = false;
        while (!complete) {
            if (qVal == currNode.val) {
                out.push(...currNode.al.map((v, i, a) => v[2]));
                complete = true;
            } else if (qVal > currNode.val) {
                // look through dr list
                for (let i = 0; i < currNode.dr.length; i++) {
                    if (currNode.dr[i][1] >= qVal) {
                        out.push(currNode.dr[i][2]);
                    } else {
                        break;
                    }
                }
                if (currNode.right != null) {
                    // move to right child
                    currNode = currNode.right;
                } else {
                    // no right child, done
                    complete = true;
                }
            } else {
                // look through al list
                for (let i = 0; i < currNode.al.length; i++) {
                    if (currNode.al[i][0] <= qVal) {
                        out.push(currNode.al[i][2]);
                    } else {
                        break;
                    }
                }
                if (currNode.left != null) {
                    // move to left child
                    currNode = currNode.left;
                } else {
                    // no left child, done
                    complete = true;
                }
            }
        }
        return out;
    }
    this.queryRange =  function() {
        let currNode = this.tree;
        
    }
    this.getOrCreateLeftChild = function(node) {
        if (node.left) return node.left;
        // create a left child
        // find the range its value should be the median of
        var range = [undefined, node.val];
        let currNode = node;
        var found = false;
        while (!found) {
            if (currNode.childType == child.RIGHT && currNode.parent) {
                found = true;
                range[0] = currNode.parent.val;
            } else if (currNode.parent === null) {
                range[0] = this.range[0];
                found = true;
            } else {
                currNode = currNode.parent;
            }
        }
        node.left = {
            parent: node,
            childType: child.LEFT,
            val: (range[0] + range[1])/2,
            al: [],
            dr: [],
            left: null,
            right: null,
        }

        return node.left;

    }
    this.getOrCreateRightChild = function(node) {
        if (node.right) return node.right;
        // create a left child
        // find the range its value should be the median of
        var range = [node.val, undefined];
        let currNode = node;
        var found = false;
        while (!found) {
            if (currNode.childType == child.LEFT && currNode.parent) {
                found = true;
                range[1] = currNode.parent.val;
            } else if (currNode.parent === null) {
                range[1] = this.range[1];
                found = true;
            } else {
                currNode = currNode.parent;
            }
        }
        node.right = {
            parent: node,
            childType: child.RIGHT,
            val: (range[0] + range[1])/2,
            al: [],
            dr: [],
            left: null,
            right: null,
        }
        
        return node.right;
    }
}

// class for keeping a track of times (for benchmarking)
function Timer() {
    this.maxSamples = 600;
    // contains entries of form
    // {
    //     avg: Number,       the mean time
    //     var: Number,       the variance of the samples
    //     stdDev: Number,    the standard deviation
    //     running: Boolean,  if timer is currently running
    //     startTime: Number  time in
    //     samples: [Sample]  past samples
    // }
    //
    // the samples are in the form
    // [Number, Number]       time, data (vert#)
    this.times = {}
    this.start = function(key) {
        if (!this.times[key]) {
            this.times[key] = {
                avg: null, 
                var: null,
                stdDev: null,
                running: false, 
                startTime: null, 
                samples: []
            };
        }
        if (this.times[key].running) {
            this.stop(key);
        }
        this.times[key].startTime = performance.now();
        this.times[key].running = true;
    };
    this.stop = function(key, data) {
        if (this.times[key].running) {
            const t = performance.now() - this.times[key].startTime
            const l = this.times[key].samples.unshift([t, data | "empty"]);
            if (l > this.maxSamples) {
                this.times[key].samples.pop();
            }
            this.times[key].running = false;
        }
    };
    this.calculateAvg = function() {
        for (let key in this.times) {
            const total = this.times[key].samples.reduce((a,b)=> a+b[0]);
            const num = this.times[key].samples.length
            //console.log(total, num)
            this.times[key].avg = total/num;
            this.times[key].running = false;
        }
    };
    this.calculateVar = function() {
        for (let key in this.times) {
            const num = this.times[key].samples.length;
            if (num == 1) {
                this.times[key].var = 0;
                this.times[key].stdDev = 0;
                continue;
            }
            const m = this.times[key].avg;
            const sum = this.times[key].samples.reduce((a,b)=> a + Math.pow(b[0] - m, 2));
            this.times[key].var = sum/num;
            this.times[key].stdDev = Math.pow(sum/num, 0.5);

        }
    };
    this.log = function() {
        this.calculateAvg();
        this.calculateVar();
        console.table({...this.times, empty: {avg:undefined}}, ["avg", "stdDev"]);
    }
    this.logSamples = function(key) {
        console.table(this.times[key].samples);
    }
    this.copySamples = function(key) {
        let str = "";
        for (let sample of this.times[key].samples) {
            str += sample[1] + "\t" + sample[0] + "\n";
        }
        navigator.clipboard.writeText(str);
    }
}

export var timer = new Timer();