<script setup>
import { computed, ref, useTemplateRef } from "vue";

defineOptions({
    inheritAttrs: false,
});

const inputRef = useTemplateRef("inputRef");
const showPassword = ref(false);

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

function focus() {
    inputRef.value?.focus();
}

function blur() {
    inputRef.value?.blur();
}

function togglePasswordVisibility() {
    showPassword.value = !showPassword.value;
}

defineExpose({ focus, blur });

const inputType = computed(() => {
    if (props.type === "password") {
        return showPassword.value ? "text" : "password";
    }
    return props.type;
});

const inputClasses = computed(() => {
    const classes = [];

    if (props.type === "color") {
        classes.push("h-8 px-0.5");
    }

    if (props.disabled) {
        classes.push("bg-gray-100 dark:bg-gray-800 cursor-not-allowed");
    }

    if (props.type === "password") {
        classes.push("pr-8");
    }

    return classes.join(" ");
});
</script>

<template>
    <div class="relative">
        <input
            ref="inputRef"
            :class="[
                'w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]',
                'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:shadow-[0_0_4px_rgba(59,130,246,0.5)]',
                inputClasses,
            ]"
            :type="inputType"
            v-model="model"
            :disabled="props.disabled"
            :placeholder="props.placeholder"
            :required="props.required"
            style="font-family: inherit"
            v-bind="$attrs"
        />

        <!-- Password visibility toggle button -->
        <button
            v-if="props.type === 'password'"
            type="button"
            @click="togglePasswordVisibility"
            :disabled="props.disabled"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:text-gray-200"
            :title="showPassword ? 'Hide password' : 'Show password'"
        >
            <!-- Eye icon for show password -->
            <svg
                v-if="!showPassword"
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
            </svg>

            <!-- Eye-off icon for hide password -->
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
            </svg>
        </button>
    </div>
</template>
