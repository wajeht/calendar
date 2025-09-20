<template>
    <div class="bg-gray-100 border-b border-gray-300 p-4 relative">
        <h2 class="m-0 text-base font-bold text-gray-800">
            <slot />
        </h2>
        <button
            class="absolute top-1/2 right-4 transform -translate-y-1/2 bg-none border-none text-lg cursor-pointer text-gray-500 p-0 w-5 h-5 flex items-center justify-center hover:text-gray-800"
            @click="$emit('close')"
        >
            &times;
        </button>
    </div>
</template>

<script setup>
defineEmits(['close']);
</script>