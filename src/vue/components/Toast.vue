<template>
    <div class="fixed top-5 right-5 z-[9999] pointer-events-none">
        <div
            v-for="toast in toastStore.toasts"
            :key="toast.id"
            :class="[
                'bg-white border border-gray-300 rounded shadow-lg p-3 mb-3 min-w-[300px] max-w-[450px] pointer-events-auto relative font-inherit transition-all duration-300 ease-in-out',
                toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
                toast.type === 'success' ? 'border-l-4 border-l-green-500' : '',
                toast.type === 'error' ? 'border-l-4 border-l-red-500' : '',
                toast.type === 'warning' ? 'border-l-4 border-l-yellow-500' : '',
                toast.type === 'info' ? 'border-l-4 border-l-blue-500' : ''
            ]"
        >
            <div class="flex items-start gap-3">
                <div
                    :class="[
                        'text-lg leading-none flex-shrink-0 mt-0.5',
                        toast.type === 'success' ? 'text-green-500' : '',
                        toast.type === 'error' ? 'text-red-500' : '',
                        toast.type === 'warning' ? 'text-yellow-500' : '',
                        toast.type === 'info' ? 'text-blue-500' : ''
                    ]"
                >
                    {{ getIcon(toast.type) }}
                </div>
                <div class="flex-1 text-sm text-gray-800 leading-relaxed">
                    <div v-if="toast.title" class="font-bold mb-1 text-sm text-gray-800">
                        {{ toast.title }}
                    </div>
                    <div>{{ toast.message }}</div>
                </div>
            </div>
            <button
                class="absolute top-1.5 right-2 bg-none border-none text-base text-gray-500 cursor-pointer p-1 w-6 h-6 flex items-center justify-center leading-none rounded hover:text-gray-600 hover:bg-gray-100"
                @click="toastStore.removeToast(toast.id)"
            >
                &times;
            </button>
        </div>
    </div>
</template>

<script setup>
import { useToast } from "../toast";

const toastStore = useToast();

function getIcon(type) {
    const icons = {
        success: "✓",
        error: "✕",
        warning: "⚠",
        info: "ℹ",
    };
    return icons[type] || icons.info;
}
</script>

