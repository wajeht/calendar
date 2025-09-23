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
    loading: {
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
    } else if (props.loading) {
        classes.push("cursor-not-allowed");
    }

    return classes.join(" ");
});
</script>

<template>
    <button
        :class="[
            'relative inline-flex items-center justify-center px-3 py-1 ml-0 mr-1 leading-snug cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm transition-all duration-200',
            buttonClasses,
        ]"
        :disabled="props.disabled || props.loading"
        style="font-family: inherit"
        v-bind="$attrs"
    >
        <span :class="props.loading ? 'invisible' : ''"><slot /></span>
        <span
            v-if="props.loading"
            class="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
        >
            <svg
                class="animate-spin h-4 w-4 text-current"
                viewBox="0 0 50 50"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="4"
                    stroke-linecap="round"
                    stroke-dasharray="44 125"
                />
            </svg>
        </span>
    </button>
</template>
