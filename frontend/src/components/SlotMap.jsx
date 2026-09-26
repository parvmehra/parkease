import { useEffect, useRef } from "react";
import { getBoundingBox, drawPolygon, indexToColor, colorToIndex } from "../utils/canvas.js";
import { SLOT_STATUS } from "../utils/constants.js";

const STATUS_COLOR = {
    [SLOT_STATUS.AVAILABLE]: "#29a66a",
    [SLOT_STATUS.OCCUPIED]: "#c7433b",
    [SLOT_STATUS.UNAVAILABLE]: "#4b5563",
};
const SELECTED_COLOR = "#d99122";
const MINE_COLOR = "#2563eb";

export function defaultSlotColor(slot, { selected, mine } = {}) {
    if (selected) return SELECTED_COLOR;
    if (mine) return MINE_COLOR;
    return STATUS_COLOR[slot.status] || STATUS_COLOR[SLOT_STATUS.AVAILABLE];
}

const DRAG_THRESHOLD_PX = 4;

/**
 * editable enables drag-to-move: mousedown on a slot then dragging translates
 * it live; onSlotMove(slot, newVertices) fires once on mouseup. A plain click
 * (no drag past the threshold) still fires onSlotClick, so selecting and
 * moving share the same gesture the way a real layout tool would.
 */
export function SlotMap({ boundary, slots, colorForSlot, onSlotClick, onSlotMove, onAddSlot, selectable = true, editable = false, addMode = false }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !boundary?.vertices?.length) return;

        const ctx = canvas.getContext("2d");
        const hitCanvas = document.createElement("canvas");
        const hitCtx = hitCanvas.getContext("2d", { willReadFrequently: true });

        const allVertices = [boundary.vertices, ...slots.map((slot) => slot.vertices || [])].flat();
        const box = getBoundingBox(allVertices);
        const width = Math.max(320, Math.floor(canvas.parentElement?.clientWidth || 700));
        const naturalRatio = box.height / Math.max(box.width, 1);
        const height = Math.max(320, Math.min(620, Math.round(width * Math.min(1.15, Math.max(0.55, naturalRatio)))));
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        hitCanvas.width = canvas.width;
        hitCanvas.height = canvas.height;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        hitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const padding = 22;
        const scale = Math.min((width - padding * 2) / Math.max(box.width, 1), (height - padding * 2) / Math.max(box.height, 1));
        const drawnWidth = box.width * scale;
        const drawnHeight = box.height * scale;
        const offsetX = (width - drawnWidth) / 2 - box.minX * scale;
        const offsetY = (height - drawnHeight) / 2 - box.minY * scale;
        const mapVertex = (v) => ({ x: offsetX + v.x * scale, y: offsetY + v.y * scale });

        function render(dragSlotIndex, dragPxOffset) {
            ctx.clearRect(0, 0, width, height);
            hitCtx.clearRect(0, 0, width, height);
            drawPolygon(ctx, boundary.vertices.map(mapVertex), "rgba(255,255,255,0.45)", true);

            slots.forEach((slot, index) => {
                if (!slot.vertices?.length) return;
                const isDragged = index === dragSlotIndex;
                const points = slot.vertices.map(mapVertex).map((p) =>
                    isDragged ? { x: p.x + dragPxOffset.x, y: p.y + dragPxOffset.y } : p
                );
                drawPolygon(ctx, points, colorForSlot(slot));
                if (!isDragged) drawPolygon(hitCtx, points, indexToColor(index + 1), false);
            });
        }

        render(-1, { x: 0, y: 0 });

        function pixelPos(event) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (event.clientX - rect.left) * (canvas.width / rect.width),
                y: (event.clientY - rect.top) * (canvas.height / rect.height),
            };
        }

        function pixelToWorld(pos) {
            return { x: Math.round((pos.x - offsetX) / scale), y: Math.round((pos.y - offsetY) / scale) };
        }

        function slotAt(pos) {
            const pixel = hitCtx.getImageData(pos.x, pos.y, 1, 1).data;
            const index = colorToIndex(pixel) - 1;
            return index >= 0 ? { slot: slots[index], index } : null;
        }

        let drag = null;

        canvas.onmousedown = addMode
            ? (event) => onAddSlot?.(pixelToWorld(pixelPos(event)))
            : editable
              ? (event) => {
                    const hit = slotAt(pixelPos(event));
                    if (!hit) return;
                    drag = { index: hit.index, start: pixelPos(event), moved: false };
                }
              : null;

        canvas.onmousemove = editable && !addMode
            ? (event) => {
                  if (!drag) return;
                  const pos = pixelPos(event);
                  const dx = pos.x - drag.start.x;
                  const dy = pos.y - drag.start.y;
                  if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) drag.moved = true;
                  if (drag.moved) render(drag.index, { x: dx, y: dy });
              }
            : null;

        canvas.onmouseup = editable && !addMode
            ? (event) => {
                  if (!drag) return;
                  const pos = pixelPos(event);
                  const dx = (pos.x - drag.start.x) / scale;
                  const dy = (pos.y - drag.start.y) / scale;
                  const slot = slots[drag.index];
                  if (drag.moved) {
                      const newVertices = slot.vertices.map((v) => ({ x: Math.round(v.x + dx), y: Math.round(v.y + dy) }));
                      onSlotMove?.(slot, newVertices);
                  } else if (selectable) {
                      onSlotClick?.(slot);
                  }
                  drag = null;
                  render(-1, { x: 0, y: 0 });
              }
            : null;

        canvas.onclick = !editable && !addMode && selectable
            ? (event) => {
                  const hit = slotAt(pixelPos(event));
                  if (hit) onSlotClick?.(hit.slot);
              }
            : null;
    }, [boundary, slots, colorForSlot, onSlotClick, onSlotMove, onAddSlot, selectable, editable, addMode]);

    if (!boundary?.vertices?.length) return null;

    return (
        <canvas
            ref={canvasRef}
            className={`w-full rounded-lg border border-border bg-surface ${addMode ? "cursor-crosshair" : editable ? "cursor-move" : ""}`}
        />
    );
}
