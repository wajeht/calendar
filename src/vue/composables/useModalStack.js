import { ref } from "vue";

const modalStack = ref([]);

function handleEscape(event) {
    if (event.key === "Escape" && modalStack.value.length > 0) {
        event.preventDefault();
        modalStack.value.at(-1)();
    }
}

export function useModalStack() {
    return {
        modalStack,
        handleEscape,
    };
}
