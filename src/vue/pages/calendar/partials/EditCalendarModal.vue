<script setup>
import { reactive, watch } from "vue";
import { useCalendar } from "../../../composables/useCalendar.js";
import Modal from "../../../components/Modal.vue";
import FormGroup from "../../../components/FormGroup.vue";
import Input from "../../../components/Input.vue";
import Button from "../../../components/Button.vue";
import Checkbox from "../../../components/Checkbox.vue";

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

const errors = reactive({
    name: "",
    url: "",
    color: "",
});

watch(
    () => props.calendar,
    (calendar) => {
        if (calendar) {
            editForm.name = calendar.name || "";
            editForm.url = calendar.url || "";
            editForm.color = calendar.color || "#3b82f6";
            editForm.hidden = Boolean(calendar.hidden);
            editForm.details = Boolean(calendar.details);
            errors.name = "";
            errors.url = "";
            errors.color = "";
        }
    },
    { immediate: true },
);

async function handleSubmit() {
    errors.name = "";
    errors.url = "";
    errors.color = "";

    const result = await updateCalendarAPI(props.calendar.id, editForm);
    if (result.success) {
        emit("calendar-updated");
        emit("close");
    } else if (result.errors) {
        Object.keys(result.errors).forEach((field) => {
            if (errors.hasOwnProperty(field)) {
                errors[field] = result.errors[field];
            }
        });
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
                <FormGroup label="Name" required :error="errors.name">
                    <Input v-model="editForm.name" type="text" required />
                </FormGroup>
                <FormGroup label="URL" required :error="errors.url">
                    <Input v-model="editForm.url" type="url" required />
                </FormGroup>
                <FormGroup label="Color" :error="errors.color">
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
