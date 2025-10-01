<script setup>
import { reactive, watch, ref } from "vue";
import { api } from "../../api.js";
import { useToast } from "../../composables/useToast";
import Modal from "../../components/Modal.vue";
import FormGroup from "../../components/FormGroup.vue";
import Input from "../../components/Input.vue";
import Button from "../../components/Button.vue";
import Checkbox from "../../components/Checkbox.vue";

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

const emit = defineEmits(["close", "calendar-updated"]);

const toast = useToast();
const isLoading = ref(false);

const editForm = reactive({
    name: "",
    url: "",
    color: "#3b82f6",
    visible_to_public: true,
    show_details_to_public: true,
    enable_notifications: false,
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
            editForm.visible_to_public = Boolean(calendar.visible_to_public);
            editForm.show_details_to_public = Boolean(calendar.show_details_to_public);
            editForm.enable_notifications =
                calendar.enable_notifications !== undefined
                    ? Boolean(calendar.enable_notifications)
                    : false;
            errors.name = "";
            errors.url = "";
            errors.color = "";
        }
    },
    { immediate: true },
);

async function handleSubmit() {
    isLoading.value = true;
    errors.name = "";
    errors.url = "";
    errors.color = "";

    try {
        const result = await api.calendar.update(props.calendar.id, editForm);
        if (result.success) {
            toast.success(result.message || "Calendar updated successfully");
            emit("calendar-updated");
            emit("close");
        } else {
            toast.error(result.message || "Failed to update calendar");
            if (result.errors) {
                Object.keys(result.errors).forEach((field) => {
                    if (errors.hasOwnProperty(field)) {
                        errors[field] = result.errors[field];
                    }
                });
            }
        }
    } catch (error) {
        toast.error("Error updating calendar: " + error.message);
    } finally {
        isLoading.value = false;
    }
}

function handleClose() {
    emit("close");
}
</script>

<template>
    <Modal title="Edit Calendar" :high-z-index="props.highZIndex" @close="handleClose">
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
                <div class="flex flex-col gap-3">
                    <Checkbox
                        :model-value="!editForm.visible_to_public"
                        @update:model-value="editForm.visible_to_public = !$event"
                        label="Hide calendar from public view"
                    />
                    <Checkbox
                        :model-value="!editForm.show_details_to_public"
                        @update:model-value="editForm.show_details_to_public = !$event"
                        label="Hide event details for public view (show as time blocks only)"
                    />
                    <Checkbox
                        v-model="editForm.enable_notifications"
                        label="Enable notifications for this calendar"
                    />
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex gap-2 justify-end">
                <Button type="submit" variant="primary" @click="handleSubmit" :loading="isLoading">
                    Update Calendar
                </Button>
                <Button type="button" @click="handleClose">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
