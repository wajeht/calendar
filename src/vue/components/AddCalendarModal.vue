<script setup>
import { reactive } from "vue";
import { useCalendar } from "../composables/useCalendar.js";
import Modal from "./ui/modal/Modal.vue";
import FormGroup from "./ui/FormGroup.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";
import Checkbox from "./ui/Checkbox.vue";

const emit = defineEmits(["close", "calendar-added"]);

const { addCalendar: addCalendarAPI, isLoading } = useCalendar();

const newCalendar = reactive({
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

function resetForm() {
    newCalendar.name = "";
    newCalendar.url = "";
    newCalendar.color = "#3b82f6";
    newCalendar.hidden = false;
    newCalendar.details = false;
    errors.name = "";
    errors.url = "";
    errors.color = "";
}

async function handleSubmit() {
    errors.name = "";
    errors.url = "";
    errors.color = "";

    const result = await addCalendarAPI(newCalendar);
    if (result.success) {
        emit("calendar-added");
        emit("close");
        resetForm();
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
    resetForm();
}
</script>

<template>
    <Modal title="Add New Calendar" @close="handleClose">
        <form @submit.prevent="handleSubmit">
            <div class="space-y-4">
                <FormGroup label="Name" required :error="errors.name">
                    <Input
                        v-model="newCalendar.name"
                        type="text"
                        placeholder="Calendar name"
                        required
                    />
                </FormGroup>
                <FormGroup label="URL" required :error="errors.url">
                    <Input
                        v-model="newCalendar.url"
                        type="url"
                        placeholder="https://example.com/calendar.ics"
                        required
                    />
                </FormGroup>
                <FormGroup label="Color" :error="errors.color">
                    <Input v-model="newCalendar.color" type="color" />
                </FormGroup>
                <div class="flex gap-6">
                    <Checkbox v-model="newCalendar.hidden" label="Hide calendar from public view" />
                    <Checkbox
                        v-model="newCalendar.details"
                        label="Hide event details for public view (show as time blocks only)"
                    />
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex gap-2">
                <Button type="submit" variant="primary" @click="handleSubmit" :disabled="isLoading">
                    Add Calendar
                </Button>
                <Button type="button" @click="handleClose">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
