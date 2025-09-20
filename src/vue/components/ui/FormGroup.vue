<template>
    <div class="mb-4">
        <label v-if="label || $slots.label" :for="inputId" class="block mb-1 font-bold text-gray-800 text-[13px]">
            <slot name="label">
                {{ label }}
                <span v-if="required" class="text-red-500 ml-0.5 font-bold">*</span>
            </slot>
        </label>
        <slot />
        <div v-if="error" class="text-red-500 text-xs mt-1">
            {{ error }}
        </div>
        <div v-if="helpText" class="text-gray-500 text-xs mt-1">
            {{ helpText }}
        </div>
    </div>
</template>


<script setup>
defineProps({
    label: {
        type: String,
        default: ''
    },
    inputId: {
        type: String,
        default: ''
    },
    required: {
        type: Boolean,
        default: false
    },
    error: {
        type: String,
        default: ''
    },
    helpText: {
        type: String,
        default: ''
    }
});
</script>
