<script setup>
const model = defineModel({
    type: Boolean,
    default: false,
});

defineProps({
    label: {
        type: String,
        default: "",
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <label class="cursor-pointer font-normal text-gray-800 text-[13px] leading-relaxed m-0 block">
        <input type="checkbox" v-model="model" :disabled="disabled" class="mr-2 mt-0.5" v-bind="$attrs" />
        <slot>{{ label }}</slot>
    </label>
</template>
