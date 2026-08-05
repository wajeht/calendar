import { computed, ref } from "vue";

const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, [role='button'], [data-no-drag]";

function getViewportSize() {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
    };
}

export function useDraggable(elementRef, viewportSize = getViewportSize) {
    const isDragging = ref(false);
    const dragOffset = ref({ x: 0, y: 0 });
    let dragState = null;

    function handleDragStart(event) {
        if (event.button !== 0 || event.target.closest(INTERACTIVE_SELECTOR)) return;

        const element = elementRef.value;
        if (!element) return;

        dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startOffsetX: dragOffset.value.x,
            startOffsetY: dragOffset.value.y,
            rect: element.getBoundingClientRect(),
        };
        isDragging.value = true;
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handleDragMove(event) {
        if (!dragState || event.pointerId !== dragState.pointerId) return;

        const { width, height } = viewportSize();
        const { rect } = dragState;
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        const clampedX = Math.min(Math.max(deltaX, -rect.left), width - rect.right);
        const clampedY = Math.min(Math.max(deltaY, -rect.top), height - rect.bottom);

        dragOffset.value = {
            x: dragState.startOffsetX + clampedX,
            y: dragState.startOffsetY + clampedY,
        };
    }

    function handleDragEnd(event) {
        if (!dragState || event.pointerId !== dragState.pointerId) return;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragState = null;
        isDragging.value = false;
    }

    const dragStyle = computed(() => ({
        "--drag-x": `${dragOffset.value.x}px`,
        "--drag-y": `${dragOffset.value.y}px`,
    }));

    return {
        isDragging,
        dragStyle,
        handleDragStart,
        handleDragMove,
        handleDragEnd,
    };
}
