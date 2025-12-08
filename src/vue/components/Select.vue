<script setup>
import { computed, useTemplateRef } from "vue";

const selectRef = useTemplateRef("selectRef");

const model = defineModel({
    type: [String, Number],
    default: "",
});

const props = defineProps({
    disabled: {
        type: Boolean,
        default: false,
    },
    required: {
        type: Boolean,
        default: false,
    },
});

function focus() {
    selectRef.value?.focus();
}

function blur() {
    selectRef.value?.blur();
}

defineExpose({ focus, blur });

const selectClasses = computed(() => {
    const classes = [];

    if (props.disabled) {
        classes.push("bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50");
    }

    return classes.join(" ");
});
</script>

<template>
    <select
        ref="selectRef"
        :class="[
            'w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:shadow-[0_0_4px_rgba(59,130,246,0.5)]',
            selectClasses,
        ]"
        v-model="model"
        :disabled="props.disabled"
        :required="props.required"
        style="font-family: inherit"
        v-bind="$attrs"
    >
        <slot />
    </select>
</template>
