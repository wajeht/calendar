<script setup>
import { ref } from "vue";
import { api } from "../../api.js";
import { useToast } from "../../composables/useToast";
import Modal from "../../components/Modal.vue";
import Button from "../../components/Button.vue";
import Checkbox from "../../components/Checkbox.vue";

const props = defineProps({
    calendars: {
        type: Array,
        required: true,
    },
    selectedCalendars: {
        type: Array,
        default: () => [],
    },
    highZIndex: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["close", "calendars-updated"]);

const toast = useToast();
const isLoading = ref(false);
const selected = ref([...props.selectedCalendars]);

function isSelected(calendarId) {
    return selected.value.includes(calendarId);
}

function toggleCalendar(calendarId, checked) {
    if (checked) {
        if (!selected.value.includes(calendarId)) {
            selected.value.push(calendarId);
        }
    } else {
        const index = selected.value.indexOf(calendarId);
        if (index !== -1) {
            selected.value.splice(index, 1);
        }
    }
}

async function handleSave() {
    isLoading.value = true;
    try {
        const result = await api.settings.updateFeedCalendars(selected.value);
        if (result.success) {
            toast.success("Feed calendars updated");
            emit("calendars-updated", selected.value);
            emit("close");
        } else {
            toast.error(result.message || "Failed to update feed calendars");
        }
    } catch (error) {
        toast.error("Error updating feed calendars: " + error.message);
    } finally {
        isLoading.value = false;
    }
}

function handleClose() {
    emit("close");
}
</script>

<template>
    <Modal title="Select Feed Calendars" :high-z-index="props.highZIndex" @close="handleClose">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select which calendars to include in your feed. Leave all unchecked to include all
            calendars.
        </p>

        <div
            class="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg"
        >
            <div
                v-for="calendar in props.calendars"
                :key="calendar.id"
                class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
                <Checkbox
                    :id="`feed-cal-${calendar.id}`"
                    :model-value="isSelected(calendar.id)"
                    @update:model-value="toggleCalendar(calendar.id, $event)"
                >
                    <span class="flex items-center gap-2">
                        <span
                            class="w-3 h-3 rounded-full flex-shrink-0"
                            :style="{ backgroundColor: calendar.color }"
                        ></span>
                        {{ calendar.name }}
                    </span>
                </Checkbox>
            </div>
            <div
                v-if="props.calendars.length === 0"
                class="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
            >
                No calendars available
            </div>
        </div>

        <template #footer>
            <div class="flex gap-2 justify-end">
                <Button variant="primary" @click="handleSave" :loading="isLoading"> Save </Button>
                <Button @click="handleClose">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
