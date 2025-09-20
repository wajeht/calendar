<template>
    <div class="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-60 z-[3000]" @click="$emit('close')">
        <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-sm shadow-lg z-[3001] max-w-[700px] w-[90%] max-h-[85vh] overflow-hidden text-[13px] leading-tight" @click.stop style="font-family: 'Lucida Grande', Helvetica, Arial, Verdana, sans-serif;">
            <div class="bg-gray-100 border-b border-gray-300 p-4 relative">
                <h2 class="m-0 text-base font-bold text-gray-800">Event Details</h2>
                <button class="absolute top-1/2 right-4 transform -translate-y-1/2 bg-none border-none text-lg cursor-pointer text-gray-500 p-0 w-5 h-5 flex items-center justify-center hover:text-gray-800" @click="$emit('close')">&times;</button>
            </div>
            <div class="p-5 max-h-[calc(85vh-140px)] overflow-y-auto">
                <div v-if="event">
                    <h3 class="text-inherit font-inherit mb-4">{{ event.title }}</h3>
                    <div class="mb-4 leading-relaxed text-[13px]">
                        <div class="mb-2">
                            <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]">Start:</span>
                            <span>{{ formatEventDate(event.start) }}</span>
                        </div>
                        <div class="mb-2">
                            <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]">End:</span>
                            <span>{{ formatEventDate(event.end) }}</span>
                        </div>
                        <div v-if="event.extendedProps && event.extendedProps.description" class="mb-2">
                            <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]">Description:</span>
                            <span>{{ event.extendedProps.description }}</span>
                        </div>
                        <div v-if="calendar" class="mb-2">
                            <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]">Calendar:</span>
                            <span :style="{ color: calendar.color }">{{ calendar.name }}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-gray-100 border-t border-gray-300 p-4 text-right">
                <button @click="$emit('close')" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-gray-800 bg-gradient-to-b from-white to-gray-200 border border-gray-300 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-gray-200 hover:to-gray-300 hover:border-gray-400" style="font-family: inherit;">Close</button>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    event: {
        type: Object,
        default: null,
    },
    calendar: {
        type: Object,
        default: null,
    },
});

defineEmits(["close"]);

function formatEventDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleString();
}
</script>
