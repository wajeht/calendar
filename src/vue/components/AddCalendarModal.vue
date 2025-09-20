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

function resetForm() {
    newCalendar.name = "";
    newCalendar.url = "";
    newCalendar.color = "#3b82f6";
    newCalendar.hidden = false;
    newCalendar.details = false;
}

async function handleSubmit() {
    const result = await addCalendarAPI(newCalendar);
    if (result.success) {
        emit("calendar-added");
        emit("close");
        resetForm();
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
                <FormGroup label="Name" required>
                    <Input
                        v-model="newCalendar.name"
                        type="text"
                        placeholder="Calendar name"
                        required
                    />
                </FormGroup>
                <FormGroup label="URL" required>
                    <Input
                        v-model="newCalendar.url"
                        type="url"
                        placeholder="https://example.com/calendar.ics"
                        required
                    />
                </FormGroup>
                <FormGroup label="Color">
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
