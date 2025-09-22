<script setup>
import { useCalendar } from "../../../composables/useCalendar.js";
import Modal from "../../../components/Modal.vue";
import Button from "../../../components/Button.vue";

const props = defineProps({
    calendar: {
        type: Object,
        required: true,
    },
    highZIndex: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["close", "calendar-deleted"]);

const { deleteCalendar: deleteCalendarAPI, isLoading } = useCalendar();

async function handleConfirm() {
    const result = await deleteCalendarAPI(props.calendar.id);
    if (result.success) {
        emit("calendar-deleted");
        emit("close");
    }
}

function handleClose() {
    emit("close");
}
</script>

<template>
    <Modal title="Delete Confirmation" :high-z-index="props.highZIndex" @close="handleClose">
        <p class="text-gray-700">
            Are you sure you want to delete "<strong>{{ props.calendar.name }}</strong
            >"? This action cannot be undone.
        </p>

        <template #footer>
            <div class="flex gap-2 justify-end">
                <Button variant="danger" @click="handleConfirm" :disabled="isLoading">
                    Delete
                </Button>
                <Button @click="handleClose">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
