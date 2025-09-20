<template>
    <div class="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-60 z-[4000]" @click="$emit('cancel')">
        <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-sm shadow-lg z-[4001] max-w-[700px] w-[90%] max-h-[85vh] overflow-hidden text-[13px] leading-tight" @click.stop style="font-family: 'Lucida Grande', Helvetica, Arial, Verdana, sans-serif;">
            <div class="bg-gray-100 border-b border-gray-300 p-4 relative">
                <h2 class="m-0 text-base font-bold text-gray-800">{{ title }}</h2>
                <button class="absolute top-1/2 right-4 transform -translate-y-1/2 bg-none border-none text-lg cursor-pointer text-gray-500 p-0 w-5 h-5 flex items-center justify-center hover:text-gray-800" @click="$emit('cancel')">&times;</button>
            </div>
            <div class="p-5 max-h-[calc(85vh-140px)] overflow-y-auto">
                <p class="m-0 leading-relaxed">{{ message }}</p>
            </div>
            <div class="bg-gray-100 border-t border-gray-300 p-4 text-right">
                <button
                    @click="$emit('confirm')"
                    :class="[
                        'relative inline-block px-3 py-1 ml-0 mr-1 leading-snug cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm',
                        type === 'delete'
                            ? 'text-white bg-gradient-to-b from-red-500 to-red-700 border border-red-500 hover:from-red-700 hover:to-red-500 hover:border-red-700'
                            : 'text-white bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-700 hover:from-slate-800 hover:to-slate-700 hover:border-slate-700'
                    ]"
                    style="font-family: inherit;"
                >
                    {{ confirmText }}
                </button>
                <button @click="$emit('cancel')" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-gray-800 bg-gradient-to-b from-white to-gray-200 border border-gray-300 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-gray-200 hover:to-gray-300 hover:border-gray-400" style="font-family: inherit;">Cancel</button>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    title: {
        type: String,
        default: "Confirm",
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        default: "default",
    },
    confirmText: {
        type: String,
        default: "Confirm",
    },
});

defineEmits(["confirm", "cancel"]);
</script>
