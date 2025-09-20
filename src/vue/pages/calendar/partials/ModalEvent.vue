<script setup>
import { computed } from "vue";
import Modal from "../../../components/Modal.vue";
import Button from "../../../components/Button.vue";

const props = defineProps({
    event: {
        type: Object,
        default: null,
    },
    calendar: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(["close"]);

function formatEventDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const formattedStartDate = computed(() => {
    return props.event?.start ? formatEventDate(props.event.start) : "";
});

const formattedEndDate = computed(() => {
    return props.event?.end ? formatEventDate(props.event.end) : "";
});
</script>

<template>
    <Modal title="Event Details" @close="emit('close')">
        <div v-if="props.event">
            <h3 class="text-inherit font-inherit mb-4">{{ props.event.title }}</h3>
            <div class="mb-4 leading-relaxed text-[13px]">
                <div class="mb-2">
                    <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]"
                        >Start:</span
                    >
                    <span>{{ formattedStartDate }}</span>
                </div>
                <div class="mb-2">
                    <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]">End:</span>
                    <span>{{ formattedEndDate }}</span>
                </div>
                <div
                    v-if="props.event.extendedProps && props.event.extendedProps.description"
                    class="mb-2"
                >
                    <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]"
                        >Description:</span
                    >
                    <span>{{ props.event.extendedProps.description }}</span>
                </div>
                <div v-if="props.calendar" class="mb-2">
                    <span class="font-bold text-gray-800 mr-2 inline-block min-w-[80px]"
                        >Calendar:</span
                    >
                    <span :style="{ color: props.calendar.color }">{{ props.calendar.name }}</span>
                </div>
            </div>
        </div>

        <template #footer>
            <Button @click="emit('close')">Close</Button>
        </template>
    </Modal>
</template>
