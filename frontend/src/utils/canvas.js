export function getBoundingBox(vertices) {
    return vertices.reduce(
        (box, v) => ({
            minX: Math.min(box.minX, v.x),
            minY: Math.min(box.minY, v.y),
            maxX: Math.max(box.maxX, v.x),
            maxY: Math.max(box.maxY, v.y),
            width: Math.max(box.maxX, v.x) - Math.min(box.minX, v.x),
            height: Math.max(box.maxY, v.y) - Math.min(box.minY, v.y),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, width: 0, height: 0 }
    );
}

export function drawPolygon(ctx, points, fill, stroke = true) {
    ctx.beginPath();
    points.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
        ctx.strokeStyle = "rgba(23,32,51,0.45)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

export function indexToColor(index) {
    const r = index & 255;
    const g = (index >> 8) & 255;
    const b = (index >> 16) & 255;
    return `rgb(${r},${g},${b})`;
}

export function colorToIndex(pixel) {
    return pixel[0] + (pixel[1] << 8) + (pixel[2] << 16);
}
