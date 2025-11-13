<script setup>
import { computed } from "vue";

const props = defineProps({
    label: {
        type: String,
        default: "",
    },
    inputId: {
        type: String,
        default: "",
    },
    required: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: "",
    },
    helpText: {
        type: String,
        default: "",
    },
});

const labelComponent = computed(() => (props.inputId ? "label" : "div"));
</script>

<template>
    <div class="mb-4">
        <component
            :is="labelComponent"
            v-if="props.label || $slots.label"
            :for="props.inputId ? props.inputId : undefined"
            class="block mb-1 font-bold text-gray-800 text-[13px]"
        >
            <slot name="label">
                {{ props.label }}
                <span v-if="props.required" class="text-red-500 ml-0.5 font-bold">*</span>
            </slot>
        </component>
        <slot />
        <div v-if="props.error" class="text-red-500 text-xs mt-1">
            {{ props.error }}
        </div>
        <div v-if="props.helpText" class="text-gray-500 text-xs mt-1">
            {{ props.helpText }}
        </div>
    </div>
</template>
