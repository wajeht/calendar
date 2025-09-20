<script setup>
import { reactive, watch } from "vue";
import { useCalendar } from "../composables/useCalendar.js";
import Modal from "./ui/modal/Modal.vue";
import FormGroup from "./ui/FormGroup.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";
import Checkbox from "./ui/Checkbox.vue";

const props = defineProps({
    calendar: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(["close", "calendar-updated"]);

const { updateCalendar: updateCalendarAPI, isLoading } = useCalendar();

const editForm = reactive({
    name: "",
    url: "",
    color: "#3b82f6",
    hidden: false,
    details: false,
});

// Initialize form with calendar data
watch(
    () => props.calendar,
    (calendar) => {
        if (calendar) {
            editForm.name = calendar.name || "";
            editForm.url = calendar.url || "";
            editForm.color = calendar.color || "#3b82f6";
            editForm.hidden = Boolean(calendar.hidden);
            editForm.details = Boolean(calendar.details);
        }
    },
    { immediate: true },
);

async function handleSubmit() {
    const result = await updateCalendarAPI(props.calendar.id, editForm);
    if (result.success) {
        emit("calendar-updated");
        emit("close");
    }
}

function handleClose() {
    emit("close");
}
</script>

<template>
    <Modal title="Edit Calendar" @close="handleClose">
        <form @submit.prevent="handleSubmit">
            <div class="space-y-4">
                <FormGroup label="Name" required>
                    <Input v-model="editForm.name" type="text" required />
                </FormGroup>
                <FormGroup label="URL" required>
                    <Input v-model="editForm.url" type="url" required />
                </FormGroup>
                <FormGroup label="Color">
                    <Input v-model="editForm.color" type="color" />
                </FormGroup>
                <div class="flex gap-6">
                    <Checkbox v-model="editForm.hidden" label="Hide calendar from public view" />
                    <Checkbox
                        v-model="editForm.details"
                        label="Hide event details for public view (show as time blocks only)"
                    />
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex gap-2">
                <Button type="submit" variant="primary" @click="handleSubmit" :disabled="isLoading">
                    Update Calendar
                </Button>
                <Button type="button" @click="handleClose">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
