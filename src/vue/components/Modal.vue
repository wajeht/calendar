<script setup>
import { computed, useTemplateRef, onMounted, onUnmounted, ref } from "vue";
import { useModalStack } from "../composables/useModalStack.js";

const { modalStack, handleEscape } = useModalStack();

const props = defineProps({
    title: {
        type: String,
        default: "",
    },
    size: {
        type: String,
        default: "default",
        validator: (value) => ["default", "large", "xl"].includes(value),
    },
    highZIndex: {
        type: Boolean,
        default: false,
    },
    closable: {
        type: Boolean,
        default: true,
    },
    bodyPadding: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["close"]);

const dialogRef = useTemplateRef("dialogRef");
const isClosing = ref(false);
const isVisible = ref(false);

function handleDialogClick(event) {
    event.stopPropagation();
}

function closeModal() {
    if (isClosing.value || !props.closable) return;
    isClosing.value = true;
    setTimeout(() => {
        dialogRef.value?.close();
        emit("close");
    }, 150);
}

function handleBackdropClick() {
    if (props.closable && modalStack.value.at(-1) === closeModal) {
        closeModal();
    }
}

onMounted(() => {
    dialogRef.value?.show();
    modalStack.value.push(closeModal);
    if (modalStack.value.length === 1) {
        document.addEventListener("keydown", handleEscape);
    }

    // Trigger entrance animation
    setTimeout(() => {
        isVisible.value = true;
    }, 10);
});

onUnmounted(() => {
    const index = modalStack.value.indexOf(closeModal);
    if (index > -1) modalStack.value.splice(index, 1);
    if (modalStack.value.length === 0) {
        document.removeEventListener("keydown", handleEscape);
    }
});

const sizeClasses = computed(() => {
    switch (props.size) {
        case "large":
            return "max-w-2xl w-[90%] max-h-[85vh]";
        case "xl":
            return "max-w-5xl w-[95%] max-h-[85vh]";
        default:
            return "max-w-md w-[90%] max-h-[85vh]";
    }
});
</script>

<template>
    <Teleport to="body">
        <div
            v-if="!isClosing"
            :class="['fixed inset-0 bg-black/40', props.highZIndex ? 'z-[3999]' : 'z-[2999]']"
            @click="handleBackdropClick"
        ></div>

        <dialog
            ref="dialogRef"
            closedby="none"
            :class="[
                'modal-dialog',
                'bg-white border border-gray-300 rounded-sm shadow-lg overflow-hidden dark:bg-gray-800 dark:border-gray-600',
                'text-[13px] leading-tight',
                props.highZIndex ? 'z-[4001]' : 'z-[3001]',
                isClosing ? 'modal-closing' : '',
                !isVisible ? 'modal-entering' : '',
                sizeClasses,
            ]"
            @click="handleDialogClick"
        >
            <!-- Modal Header -->
            <div
                v-if="props.title || $slots.header"
                class="bg-gray-100 border-b border-gray-300 p-4 relative dark:bg-gray-900 dark:border-gray-600"
            >
                <h2 class="m-0 text-base font-bold text-gray-800 dark:text-gray-100">
                    <slot name="header">{{ props.title }}</slot>
                </h2>
                <button
                    v-if="props.closable"
                    class="modal-close-btn absolute top-1/2 right-4 transform -translate-y-1/2 bg-transparent border-0 text-lg cursor-pointer text-gray-500 p-0 w-5 h-5 flex items-center justify-center hover:text-gray-800 transition-colors duration-150 dark:text-gray-400 dark:hover:text-gray-200"
                    tabindex="-1"
                    @click="closeModal"
                    style="font-family: inherit; outline: none"
                >
                    ×
                </button>
            </div>

            <!-- Modal Body -->
            <div
                :class="[
                    props.bodyPadding ? 'p-4' : 'p-0',
                    'max-h-[calc(85vh-140px)] overflow-y-auto',
                ]"
            >
                <slot />
            </div>

            <!-- Modal Footer -->
            <div
                v-if="$slots.footer"
                class="bg-gray-100 border-t border-gray-300 p-4 text-right dark:bg-gray-900 dark:border-gray-600"
            >
                <slot name="footer" />
            </div>
        </dialog>
    </Teleport>
</template>

<style scoped>
.modal-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    margin: 0;
    padding: 0;
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
    transition:
        opacity 0.15s ease-out,
        transform 0.15s ease-out;
}

.modal-entering {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
}

.modal-closing {
    opacity: 0 !important;
    transform: translate(-50%, -50%) scale(0.95) !important;
}

dialog::backdrop {
    background: transparent !important;
    backdrop-filter: none !important;
}
</style>
