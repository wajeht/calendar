<template>
    <div class="modal-overlay" @click="$emit('cancel')">
        <div class="modal" @click.stop>
            <div class="modal-header">
                <h2>{{ title }}</h2>
                <button class="modal-close" @click="$emit('cancel')">&times;</button>
            </div>
            <div class="modal-body">
                <p>{{ message }}</p>
            </div>
            <div class="modal-footer">
                <button
                    @click="$emit('confirm')"
                    :class="['btn', type === 'delete' ? 'btn-danger' : 'btn-primary']"
                >
                    {{ confirmText }}
                </button>
                <button @click="$emit('cancel')" class="btn">Cancel</button>
            </div>
        </div>
    </div>
</template>

<script setup>
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
