<script setup>
import { api } from "../../api.js";
import { ref } from "vue";
import { useToast } from "../../composables/useToast";
import Modal from "../../components/Modal.vue";
import Button from "../../components/Button.vue";

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

const isLoading = ref(false);
const toast = useToast();

async function handleConfirm() {
    isLoading.value = true;
    try {
        const result = await api.calendar.delete(props.calendar.id);
        if (result.success) {
            toast.success(result.message || "Calendar deleted successfully");
            emit("calendar-deleted");
            emit("close");
        } else {
            toast.error(result.message || "Failed to delete calendar");
        }
    } catch (error) {
        toast.error("Error deleting calendar: " + error.message);
    } finally {
        isLoading.value = false;
    }
}

function handleClose() {
    emit("close");
}
</script>

<template>
    <Modal title="Delete Confirmation" :high-z-index="props.highZIndex" @close="handleClose">
        <p class="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete "<strong>{{ props.calendar.name }}</strong
            >"? This action cannot be undone.
        </p>

        <template #footer>
            <div class="flex gap-2 justify-end">
                <Button variant="danger" @click="handleConfirm" :loading="isLoading">
                    Delete
                </Button>
                <Button @click="handleClose">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
