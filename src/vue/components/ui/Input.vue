<script setup>
import { computed, ref } from "vue";

const inputRef = ref(null);

const model = defineModel({
    type: [String, Number],
    default: "",
});

const props = defineProps({
    type: {
        type: String,
        default: "text",
    },
    placeholder: {
        type: String,
        default: "",
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    required: {
        type: Boolean,
        default: false,
    },
});

// Expose methods for parent components
function focus() {
    inputRef.value?.focus();
}

function blur() {
    inputRef.value?.blur();
}

defineExpose({ focus, blur });

const inputClasses = computed(() => {
    const classes = [];

    // Special styling for color inputs
    if (props.type === "color") {
        classes.push("h-8 px-0.5");
    }

    // Disabled state
    if (props.disabled) {
        classes.push("bg-gray-100 cursor-not-allowed");
    }

    return classes.join(" ");
});
</script>

<template>
    <input
        ref="inputRef"
        :class="[
            'w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]',
            inputClasses,
        ]"
        :type="type"
        v-model="model"
        :disabled="disabled"
        :placeholder="placeholder"
        :required="required"
        style="font-family: inherit"
        v-bind="$attrs"
    />
</template>
