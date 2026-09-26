const mycanvas = document.getElementById('mycanvas');
const ctx = mycanvas.getContext('2d');
const pname = document.getElementById('pname');

// Create an invisible offset canvas for hit detection
const offsetCanvas = document.createElement('canvas');
const offsetCtx = offsetCanvas.getContext('2d', { willReadFrequently: true });

// Helper: get bounding box from vertices
function getBoundingBox(vertices) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	vertices.forEach(v => {
        minX = Math.min(minX, v.x);
		minY = Math.min(minY, v.y);
		maxX = Math.max(maxX, v.x);
		maxY = Math.max(maxY, v.y);
	});
	return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Main function to fetch and draw
async function displayLot(lotId) {
    try {
		const now = new Date();
		console.log(now.toISOString());
		const x = new Date((now.getTime()+ 5 * 60 * 60 * 1000 + 30 * 60 * 1000)).toISOString();
		console.log(x);
		const startTimeVar = new Date(now.getTime()+ 5 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
		const endTimeVar = new Date(now.getTime() + 7 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
		console.log(startTimeVar, endTimeVar);
		const res = await fetch(`http://localhost:4444/api/canvas/display/${lotId}/avaliability`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGZjMWQ0YWQ4OWViNDMwZjM5OTQ2YTMiLCJpYXQiOjE3NjEzNTM0NzMsImV4cCI6MTc2MTQzOTg3M30.np1DuB__pvmQ9F4Z6f3hum-1TRYC4UQCRPXoHFg1BYc'
			},
			body: JSON.stringify({
				startTimeVar,
				endTimeVar
			})
		});
		if (!res.ok) throw new Error('Failed to fetch lot data');
		const data = await res.json();
		const boundary = data.boundary; 
		const slots = data.slots; 
		pname.textContent = boundary.name;
        
		// Add click handler to canvas (uses offset for hit detection)
		mycanvas.onclick = function(event) {
            const rect = mycanvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			const pixel = offsetCtx.getImageData(x, y, 1, 1).data;
			const idx = colorToInt(pixel[0], pixel[1], pixel[2]);
			if (idx > 0 && idx <= slots.length) {
                console.log(slots[idx-1]._id);
			} else {
                console.log('not a valid slot');
			}
		};
        
		
		const bbox = getBoundingBox(boundary.vertices);
        
		
		const maxCanvasSide = 500;
		let scale = 1;
		let canvasWidth, canvasHeight;
		if (bbox.width > bbox.height) {
            scale = maxCanvasSide / bbox.width;
			canvasWidth = maxCanvasSide;
			canvasHeight = bbox.height * scale;
		} else {
            scale = maxCanvasSide / bbox.height;
			canvasHeight = maxCanvasSide;
			canvasWidth = bbox.width * scale;
		}
		mycanvas.width = canvasWidth;
		mycanvas.height = canvasHeight;
		offsetCanvas.width = canvasWidth;
		offsetCanvas.height = canvasHeight;
        
		ctx.clearRect(0, 0, mycanvas.width, mycanvas.height);
        
		function mapVertex(v) {
            return {
				x: (v.x - bbox.minX) * scale,
				y: (v.y - bbox.minY) * scale
			};
		}
        
        
		ctx.save();
		ctx.beginPath();
		boundary.vertices.forEach((v, i) => {
            const { x, y } = mapVertex(v);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		});
		ctx.closePath();
		ctx.restore();
        
		slots.forEach((slot, idx) => {
            ctx.save();
			ctx.beginPath();
			slot.vertices.forEach((v, i) => {
                const { x, y } = mapVertex(v);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			});
			ctx.closePath();
			if(slot.status==="booked"){
				ctx.fillStyle = '#ff4c4cff'; 
			}else if(slot.status==="unavaliable"){
				ctx.fillStyle = '#3b3b3bff'; 
			}
			else{
				ctx.fillStyle = '#4bd75bff'; 
			}
			ctx.fill();
			ctx.strokeStyle = '#228B22'; 
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.restore();
            
			//offset ampping 
			offsetCtx.save();
			offsetCtx.beginPath();
			slot.vertices.forEach((v, i) => {
                const { x, y } = mapVertex(v);
				if (i === 0) offsetCtx.moveTo(x, y);
				else offsetCtx.lineTo(x, y);
			});
			offsetCtx.closePath();
			// Assign a unique color for each slot (idx+1)
			const color = intToColor(idx+1);
			offsetCtx.fillStyle = color;
			offsetCtx.fill();
			offsetCtx.restore();
		});
        // End of slots.forEach
        
	} catch (err) {
        alert('Error: ' + err.message);
	}
}

function intToColor(i) {
    // i: 1..255
    return `rgb(0,0,${i})`;
}

function colorToInt(r, g, b) {
    return b;
}
displayLot("68fc2f262c02cf3e52d62f10");