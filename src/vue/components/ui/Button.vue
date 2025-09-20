<script setup>
import { computed } from "vue";

const props = defineProps({
    variant: {
        type: String,
        default: "default",
        validator: (value) => ["default", "primary", "danger", "warning"].includes(value),
    },
    size: {
        type: String,
        default: "default",
        validator: (value) => ["default", "small"].includes(value),
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const buttonClasses = computed(() => {
    const classes = [];

    switch (props.variant) {
        case "primary":
            classes.push(
                "text-white bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-700 hover:from-slate-800 hover:to-slate-700 hover:border-slate-700",
            );
            break;
        case "danger":
            classes.push(
                "text-white bg-gradient-to-b from-red-500 to-red-700 border border-red-500 hover:from-red-700 hover:to-red-500 hover:border-red-700",
            );
            break;
        case "warning":
            classes.push(
                "text-white bg-gradient-to-b from-yellow-500 to-yellow-600 border border-yellow-500 hover:from-yellow-600 hover:to-yellow-500 hover:border-yellow-600",
            );
            break;
        default:
            classes.push(
                "text-gray-800 bg-gradient-to-b from-white to-gray-200 border border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400",
            );
    }

    if (props.size === "small") {
        classes.push("text-xs px-3 py-1");
    }

    if (props.disabled) {
        classes.push("opacity-50 cursor-not-allowed");
    }

    return classes.join(" ");
});
</script>

<template>
    <button
        :class="[
            'relative inline-block px-3 py-1 ml-0 mr-1 leading-snug cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm transition-all duration-200',
            buttonClasses,
        ]"
        :disabled="disabled"
        style="font-family: inherit"
        v-bind="$attrs"
    >
        <slot />
    </button>
</template>
