<script setup>
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
</script>

<template>
    <div class="mb-4">
        <label
            v-if="props.label || $slots.label"
            :for="props.inputId"
            class="block mb-1 font-bold text-gray-800 text-[13px]"
        >
            <slot name="label">
                {{ props.label }}
                <span v-if="props.required" class="text-red-500 ml-0.5 font-bold">*</span>
            </slot>
        </label>
        <slot />
        <div v-if="props.error" class="text-red-500 text-xs mt-1">
            {{ props.error }}
        </div>
        <div v-if="props.helpText" class="text-gray-500 text-xs mt-1">
            {{ props.helpText }}
        </div>
    </div>
</template>
