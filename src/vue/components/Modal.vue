<script setup>
import { computed, useTemplateRef, onMounted, ref } from "vue";

const props = defineProps({
    title: {
        type: String,
        default: "",
    },
    size: {
        type: String,
        default: "default",
        validator: (value) => ["default", "large"].includes(value),
    },
    highZIndex: {
        type: Boolean,
        default: false,
    },
    closable: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["close"]);

const dialogRef = useTemplateRef("dialogRef");
const isClosing = ref(false);

function handleDialogClick(event) {
    event.stopPropagation();
}

function closeModal() {
    if (isClosing.value) return;
    isClosing.value = true;
    setTimeout(() => {
        dialogRef.value?.close();
        emit("close");
    }, 150);
}

onMounted(() => {
    dialogRef.value?.show();
});

const sizeClasses = computed(() => {
    switch (props.size) {
        case "large":
            return "max-w-2xl w-[90%] max-h-[85vh]";
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
            @click="props.closable ? closeModal : null"
        ></div>

        <dialog
            ref="dialogRef"
            closedby="none"
            :class="[
                'modal-dialog',
                'bg-white border border-gray-300 rounded-sm shadow-lg overflow-hidden',
                'text-[13px] leading-tight',
                props.highZIndex ? 'z-[4001]' : 'z-[3001]',
                isClosing ? 'modal-closing' : '',
                sizeClasses,
            ]"
            @click="handleDialogClick"
        >
            <!-- Modal Header -->
            <div
                v-if="props.title || $slots.header"
                class="bg-gray-100 border-b border-gray-300 p-4 relative"
            >
                <h2 class="m-0 text-base font-bold text-gray-800">
                    <slot name="header">{{ props.title }}</slot>
                </h2>
                <button
                    v-if="props.closable"
                    class="absolute top-1/2 right-4 transform -translate-y-1/2 bg-none border-none text-lg cursor-pointer text-gray-500 p-0 w-5 h-5 flex items-center justify-center hover:text-gray-800"
                    @click="closeModal"
                >
                    &times;
                </button>
            </div>

            <!-- Modal Body -->
            <div class="p-4 max-h-[calc(85vh-140px)] overflow-y-auto">
                <slot />
            </div>

            <!-- Modal Footer -->
            <div v-if="$slots.footer" class="bg-gray-100 border-t border-gray-300 p-4 text-right">
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

.modal-closing {
    opacity: 0 !important;
    transform: translate(-50%, -50%) scale(0.95) !important;
}

dialog::backdrop {
    background: transparent !important;
    backdrop-filter: none !important;
}

@starting-style {
    dialog:open {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
    }
}
</style>
