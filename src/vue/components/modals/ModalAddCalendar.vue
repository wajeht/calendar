<script setup>
import { reactive, ref } from "vue";
import { api } from "../../api.js";
import { useToast } from "../../composables/useToast";
import Modal from "../../components/Modal.vue";
import Button from "../../components/Button.vue";
import FormGroup from "../../components/FormGroup.vue";
import Input from "../../components/Input.vue";
import Checkbox from "../../components/Checkbox.vue";

const props = defineProps({
    highZIndex: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["close", "calendar-added"]);

const toast = useToast();
const isLoading = ref(false);

const newCalendar = reactive({
    name: "",
    url: "",
    color: "#3b82f6",
    visible_to_public: true,
    show_details_to_public: true,
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
    newCalendar.visible_to_public = true;
    newCalendar.show_details_to_public = true;
    errors.name = "";
    errors.url = "";
    errors.color = "";
}

async function handleSubmit() {
    isLoading.value = true;
    errors.name = "";
    errors.url = "";
    errors.color = "";

    try {
        const result = await api.calendar.create(newCalendar);
        if (result.success) {
            toast.success(result.message || "Calendar added successfully");
            emit("calendar-added");
            emit("close");
            resetForm();
        } else {
            toast.error(result.message || "Failed to add calendar");
            if (result.errors) {
                Object.keys(result.errors).forEach((field) => {
                    if (errors.hasOwnProperty(field)) {
                        errors[field] = result.errors[field];
                    }
                });
            }
        }
    } catch (error) {
        toast.error("Error adding calendar: " + error.message);
    } finally {
        isLoading.value = false;
    }
}

function handleClose() {
    emit("close");
    resetForm();
}
</script>

<template>
    <Modal title="Add New Calendar" :high-z-index="props.highZIndex" @close="handleClose">
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
                    <Checkbox
                        :model-value="!newCalendar.visible_to_public"
                        @update:model-value="newCalendar.visible_to_public = !$event"
                        label="Hide calendar from public view"
                    />
                    <Checkbox
                        :model-value="!newCalendar.show_details_to_public"
                        @update:model-value="newCalendar.show_details_to_public = !$event"
                        label="Hide event details for public view (show as time blocks only)"
                    />
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex gap-2 justify-end">
                <Button type="submit" variant="primary" @click="handleSubmit" :disabled="isLoading">
                    Add Calendar
                </Button>
                <Button type="button" @click="handleClose">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
