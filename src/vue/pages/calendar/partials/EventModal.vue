<script setup>
import Modal from "../../../components/modal/Modal.vue";
import Button from "../../../components/ui/Button.vue";

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

<template>
    <Modal title="Event Details" @close="$emit('close')">
        <div v-if="event">
            <h3 class="text-inherit font-inherit mb-4">{{ event.title }}</h3>
            <div class="mb-4 leading-relaxed text-[13px]">
                <div class="mb-2">
                    <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]"
                        >Start:</span
                    >
                    <span>{{ formatEventDate(event.start) }}</span>
                </div>
                <div class="mb-2">
                    <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]">End:</span>
                    <span>{{ formatEventDate(event.end) }}</span>
                </div>
                <div v-if="event.extendedProps && event.extendedProps.description" class="mb-2">
                    <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]"
                        >Description:</span
                    >
                    <span>{{ event.extendedProps.description }}</span>
                </div>
                <div v-if="calendar" class="mb-2">
                    <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]"
                        >Calendar:</span
                    >
                    <span :style="{ color: calendar.color }">{{ calendar.name }}</span>
                </div>
            </div>
        </div>

        <template #footer>
            <Button @click="$emit('close')">Close</Button>
        </template>
    </Modal>
</template>
