<script setup>
import Modal from "../../../components/modal/Modal.vue";
import Button from "../../../components/ui/Button.vue";

const props = defineProps({
    title: {
        type: String,
        default: "Confirm",
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        default: "default",
    },
    confirmText: {
        type: String,
        default: "Confirm",
    },
});

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
    <Modal :title="props.title" high-z-index @close="emit('cancel')">
        <p class="m-0 leading-relaxed">{{ props.message }}</p>

        <template #footer>
            <Button
                :variant="props.type === 'delete' ? 'danger' : 'primary'"
                @click="emit('confirm')"
            >
                {{ props.confirmText }}
            </Button>
            <Button @click="emit('cancel')">Cancel</Button>
        </template>
    </Modal>
</template>
