<script setup>
import { computed } from "vue";

defineOptions({
    inheritAttrs: false,
});

const model = defineModel({
    type: [Boolean, Number],
    default: false,
});

const props = defineProps({
    label: {
        type: String,
        default: "",
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    id: {
        type: String,
        default: "",
    },
});

const generatedId = `checkbox-${Math.random().toString(36).substr(2, 9)}`;
const checkboxId = computed(() => {
    return props.id || generatedId;
});
</script>

<template>
    <label
        :for="checkboxId"
        class="cursor-pointer font-normal text-gray-800 text-[13px] leading-relaxed m-0 flex items-center"
    >
        <div class="relative flex items-center mr-2">
            <input
                :id="checkboxId"
                type="checkbox"
                v-model="model"
                :disabled="props.disabled"
                class="sr-only"
            />
            <div
                :class="[
                    'w-4 h-4 border rounded-sm flex items-center justify-center transition-all duration-200',
                    model
                        ? 'border-slate-700 bg-slate-700'
                        : 'border-gray-300 bg-white hover:border-slate-400',
                    props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ]"
            >
                <svg
                    v-if="model"
                    class="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                    />
                </svg>
            </div>
        </div>
        <span class="flex-1">
            <slot>{{ props.label }}</slot>
        </span>
    </label>
</template>
