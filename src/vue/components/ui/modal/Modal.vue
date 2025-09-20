<script setup>
import { computed } from "vue";
import ModalHeader from "./ModalHeader.vue";
import ModalBody from "./ModalBody.vue";
import ModalFooter from "./ModalFooter.vue";

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
});

defineEmits(["close"]);

const sizeClasses = computed(() => {
    switch (props.size) {
        case "large":
            return "max-w-4xl w-[90%] max-h-[85vh]";
        default:
            return "max-w-[700px] w-[90%] max-h-[85vh]";
    }
});
</script>

<template>
    <div
        :class="['fixed top-0 left-0 right-0 bottom-0', highZIndex ? 'z-[4000]' : 'z-[3000]']"
        class="animate-fadeIn"
        style="background-color: rgba(0, 0, 0, 0.4)"
        @click="$emit('close')"
    >
        <div
            :class="[
                'fixed top-1/2 left-1/2 bg-white border border-gray-300 rounded-sm shadow-lg overflow-hidden text-[13px] leading-tight',
                highZIndex ? 'z-[4001]' : 'z-[3001]',
                animated
                    ? 'animate-scaleIn transform -translate-x-1/2 -translate-y-1/2'
                    : 'transform -translate-x-1/2 -translate-y-1/2',
                sizeClasses,
            ]"
            @click.stop
        >
            <ModalHeader v-if="title || $slots.header" @close="$emit('close')">
                <slot name="header">{{ title }}</slot>
            </ModalHeader>

            <ModalBody>
                <slot />
            </ModalBody>

            <ModalFooter v-if="$slots.footer">
                <slot name="footer" />
            </ModalFooter>
        </div>
    </div>
</template>

<style scoped>
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.09s ease-out;
}

.animate-scaleIn {
    animation: fadeIn 0.09s ease-out;
}
</style>
