<script setup>
defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    label: {
        type: String,
        default: ''
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

defineEmits(['update:modelValue']);
</script>

<template>
    <label class="cursor-pointer font-normal text-gray-800 text-[13px] leading-relaxed m-0 block">
        <input type="checkbox" :checked="modelValue" :disabled="disabled" class="mr-2 mt-0.5"
            @change="$emit('update:modelValue', $event.target.checked)" v-bind="$attrs" />
        <slot>{{ label }}</slot>
    </label>
</template>
