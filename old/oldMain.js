//3d js

var canvas = document.getElementById("c");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext("2d");
ctx.translate(canvas.width/2, canvas.height/2);

function arrayHasArray(arr, arr2) {
	var found = false;
	for(let i of arr) {
		for(var j = 0; j < i.length; j++) {
			if(i[j] != arr2[j]) {
				break;
			} else if(j == i.length - 1) {
				found = true;
				break;
			};
		};
		if(found) {
			return true;
		};
	};
	return false;
};

function areArraysEqual(arr, arr1) {
	if(!(Array.isArray(arr) && Array.isArray(arr1))){
		return false;
	} else {
		for(var i = 0; i < arr.length; i++) {
			if(arr[i] != arr1[i]) {
				return false;
			};
		};
		return true;
	};
};

var mouse = {
	down: false,
	pos: [0, 0],
	dragFrom: [0, 0]
};

var keys = {
	"37": "left",
	"65": "left",
	"38": "up",
	"87": "up",
	"39": "right",
	"68": "right",
	"40": "down",
	"83": "down",
	"32": "jump",
	"69": "e",
	"81": "q"
};


document.onkeydown = function() {
	const key = keys[event.keyCode.toString()];
	switch(key) {
		case "left":
		case "up":
		case "right":
		case "down":
			selectedLevel.player.input.direction = getRotatedDirection(key);
			break;
		case "e":
			if(selectedLevel.toTransform.rotate == 0) {
				if(selectedLevel.rotation % 90 == 0) {
					selectedLevel.toTransform.rotate -= 90
				} else {
					selectedLevel.toTransform.rotate -= selectedLevel.rotation % 90;
				};
			};
			break;
		case "q":
			if(selectedLevel.toTransform.rotate == 0) {
				if(selectedLevel.rotation % 90 == 0) {
					selectedLevel.toTransform.rotate += 90
				} else {
					selectedLevel.toTransform.rotate += 90 - selectedLevel.rotation % 90;
				};
			};
			break;
			
	};
};

var dirIndex = {"left": 0, "up": 1, "right": 2, "down": 3};
var dirMap = ["yMinus", "xMinus", "yPlus", "xPlus"];
//left, up, right, down in default rotation

function getRotatedDirection(dir) {
	const rot = selectedLevel.rotation;
	var offset;
	if (rot < 90) {
		offset = 0;
	} else if (rot < 180) {
		offset = 1;
	} else if (rot < 270) {
		offset = 2;
	} else {
		offset = 3;
	}
	return dirMap[(dirIndex[dir] + offset)%4];
}

document.onkeypress = function() {
	if(event.keyCode == 32 && selectedLevel.player.onGround && selectedLevel.player.input.toJump == 0) {
		selectedLevel.player.input.toJump += 2;
	};
};

document.onkeyup = function() {
	const key = keys[event.keyCode.toString()]
	switch(key) {
		case "left":
		case "up":
		case "right":
		case "down":
			if (getRotatedDirection(key) == selectedLevel.player.input.direction) {
				selectedLevel.player.input.direction = "";
			};
			break;
	};
};

document.onmousedown = function() {
	mouse.down = true;
	mouse.dragFrom = [event.clientX, event.clientY];
};

document.onmousemove = function() {
	if(mouse.down) {
		mouse.pos = [event.clientX, event.clientY];
		selectedLevel.rotate((mouse.pos[0] - mouse.dragFrom[0])/2);
		//SCALE -= (mouse.pos[1] - mouse.dragFrom[1])/10;
		mouse.dragFrom = [event.clientX, event.clientY];
	};
};

document.onmouseup = function() {
	mouse.down = false;
};

var SCALE = 30;

function isoProject(vec, scal) {
	var newVec = VecMath.scalMult(scal, VecMath.matrixVecMult(selectedLevel.projectionMatrix, vec));
		
	return newVec;
};

var themes = {
	normal: {
		level: new HSLAColour(),//new RGBAColour(100, 100, 100),
		player: new HSLAColour(360, 100, 0),//new RGBAColour(255)
		goal: new HSLAColour(240, 100, 0),
		source: function(strength) {
			return new HSLAColour(0, 0, strength);
		}
	}
};

var selectedTheme = "normal";



function Line(begin, end, col) {
	this.begin = begin || [0, 0, 0];
	this.end = end;
	this.col = col;
	this.draw = function() {
		var point1 = isoProject(this.begin, SCALE);
		var point2 = isoProject(this.end, SCALE);
		
		ctx.beginPath()
		ctx.moveTo(point1[0], point1[1]);
		ctx.lineTo(point2[0], point2[1]);
		ctx.strokeStyle = col;
		ctx.stroke();
	};
};

function Face(points, col, dir, isEmit) {
	
	// The face prototype expects a HSL colour value but with the 
	// luminosity omitted, in an array
	
	this.points = points;
	this.points2d = [];
	this.col = col;
	this.dir = dir;
	this.isEmit = isEmit;
	
	if(!isEmit) {
		switch(this.dir) {
			case "xPlus":
				this.normal = [1, 0, 0];
				this.midPoint = [this.points[0][0], this.points[0][1] + 0.5,  this.points[0][2] + 0.5];
				break;
			case "xMinus":
				this.normal = [-1, 0, 0];
				this.midPoint = [this.points[0][0], this.points[0][1] + 0.5,  this.points[0][2] + 0.5];
				break;
			case "yPlus":
				this.normal = [0, 1, 0];
				this.midPoint = [this.points[0][0] + 0.5, this.points[0][1],  this.points[0][2] + 0.5];
				break;
			case "yMinus":
				this.normal = [0, -1, 0];
				this.midPoint = [this.points[0][0] + 0.5, this.points[0][1],  this.points[0][2] + 0.5];
				break;
			case "zPlus":
				this.normal = [0, 0, 1];
				this.midPoint = [this.points[0][0] + 0.5, this.points[0][1] + 0.5,  this.points[0][2]];
				break;
		};
		
		lightSim.surfaces.push(new Surface(this.midPoint, this.col, this.normal));
		this.lightingObjectIndex = lightSim.surfaces.length - 1;
	};
	
	this.recalculate = function() {
		this.points2d = [];
		var offSet = selectedLevel.midPoint;
		for (var i = 0; i < this.points.length; i++) {
			this.points2d.push(isoProject(VecMath.vecMinus(this.points[i], offSet), SCALE));
		};
	};
	
	this.recalculate();
	
	this.draw = function() {
		var realCol;
		if(this.isEmit) {
			realCol =  ColMath.toHSLAString(this.col);
		} else {
			realCol = ColMath.toHSLAString(lightSim.surfaces[this.lightingObjectIndex].getRealCol());
		};
		ctx.fillStyle = realCol;
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(this.points2d[0][0], this.points2d[0][1]);
		for (var i = 1; i < this.points2d.length; i++) {
			ctx.lineTo(this.points2d[i][0], this.points2d[i][1]);
		};
		ctx.lineTo(this.points2d[0][0], this.points2d[0][1]);
		ctx.closePath();
		ctx.stroke();
		ctx.fill();
	};
};


function getNow() {
	var time = new Date();
	return time.getTime();
};

var time = new Date();
var last = time.getTime();
var FPS = {
	value: 0,
	last: getNow(),
	now: getNow(),
	framesPerSample: 5,
	calculate: function() {
		if(count == this.framesPerSample){
			this.now = getNow();
			this.value = Math.round((1000 * this.framesPerSample)/(this.now - this.last));
			this.last = this.now;
			count = 0;
		};
	},
	draw: function() {
		ctx.strokeStyle = "yellow";
		ctx.font = "30px arial";
		ctx.beginPath();
		ctx.strokeText(this.value, -canvas.width/2, 24 - canvas.height/2);
		ctx.stroke();
	}
}
var count = 0;

function main() {
	
	ctx.fillStyle = "black";
	ctx.fillRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
	if(changingLevels && currentLevelIndex + 1 < levels.length) {
		currentLevelIndex++;
		selectedLevel = levels[currentLevelIndex];
		selectedLevel.setup();
		changingLevels = false;
	}
	selectedLevel.draw();
	
	FPS.calculate();
	FPS.draw();
	
	count++;
	
	window.requestAnimationFrame(main);
	
};

main();







