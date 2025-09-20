<template>
    <div class="modal-overlay" @click="$emit('close')">
        <div class="modal" @click.stop>
            <div class="modal-header">
                <h2>Event Details</h2>
                <button class="modal-close" @click="$emit('close')">&times;</button>
            </div>
            <div class="modal-body">
                <div v-if="event">
                    <h3>{{ event.title }}</h3>
                    <p><strong>Start:</strong> {{ formatEventDate(event.start) }}</p>
                    <p><strong>End:</strong> {{ formatEventDate(event.end) }}</p>
                    <p v-if="event.extendedProps && event.extendedProps.description">
                        <strong>Description:</strong> {{ event.extendedProps.description }}
                    </p>
                    <p v-if="calendar">
                        <strong>Calendar:</strong>
                        <span :style="{ color: calendar.color }">{{ calendar.name }}</span>
                    </p>
                </div>
            </div>
            <div class="modal-footer">
                <button @click="$emit('close')" class="btn">Close</button>
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
