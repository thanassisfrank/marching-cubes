var populateData = (data, scale) => {
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            data[i][j] = noise2D(j, i, scale);
        }
    }
}

var drawDataPoints = (ctx, data, x, y, spacing) => {
    size = spacing
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            let val = parseInt(255*data[i][j]);
            ctx.fillStyle = "rgb("+val+", "+val+", "+val+")";
            ctx.fillRect(x+spacing*j, y+spacing*i, size, size);
        }
    }
}

let v0 = data[i][j][k] > threshold;
let v1 = data[i+1][j][k] > threshold;
let v2 = data[i+1][j+1][k] > threshold;
let v3 = data[i][j+1][k] > threshold;
let v4 = data[i][j][k+1] > threshold;
let v5 = data[i+1][j][k+1] > threshold;
let v6 = data[i+1][j+1][k+1] > threshold;
let v7 = data[i][j+1][k+1] > threshold;

{
	let verts_ = []
	if (v0) verts_.push(0)
	if (v1) verts_.push(1)
	if (v2) verts_.push(2)
	if (v3) verts_.push(3)
	if (v4) verts_.push(4)
	if (v5) verts_.push(5)
	if (v6) verts_.push(6)
	if (v7) verts_.push(7)
	console.log(verts_)
}

//generates code for each gridcell
let code = v0<<0|v1<<1|v2<<2|v3<<3|v4<<4|v5<<5|v6<<6|v7<<7;
console.log(code.toString(2))

// calculate the total used space: data, code, verts + normals, indices
const used = dataObj.volume*4 + (dataObj.size[0]-1)*(dataObj.size[1]-1)*(dataObj.size[2]-1)*4 + vertsNumber*3*4*2 + indicesNumber*4;