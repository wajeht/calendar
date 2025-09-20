<script setup>
import Modal from "./ui/modal/Modal.vue";
import Button from "./ui/Button.vue";

defineProps({
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

defineEmits(["confirm", "cancel"]);
</script>

<template>
    <Modal :title="title" high-z-index @close="$emit('cancel')">
        <p class="m-0 leading-relaxed">{{ message }}</p>

        <template #footer>
            <Button :variant="type === 'delete' ? 'danger' : 'primary'" @click="$emit('confirm')">
                {{ confirmText }}
            </Button>
            <Button @click="$emit('cancel')">Cancel</Button>
        </template>
    </Modal>
</template>
