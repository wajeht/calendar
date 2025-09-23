<script setup>
import { ref, reactive, nextTick, onMounted, useTemplateRef } from "vue";
import Modal from "../../components/Modal.vue";
import FormGroup from "../../components/FormGroup.vue";
import Input from "../../components/Input.vue";
import Button from "../../components/Button.vue";
import { useAuth } from "../../composables/useAuth.js";

const emit = defineEmits(["close", "password-configured"]);
const { setupPassword, isLoading } = useAuth();

const password = ref("");
const confirmPassword = ref("");
const passwordInput = useTemplateRef("passwordInput");

const errors = reactive({
    password: "",
    confirmPassword: "",
});

async function handleSetupPassword() {
    errors.password = "";
    errors.confirmPassword = "";

    const result = await setupPassword(password.value, confirmPassword.value);
    if (result.success) {
        emit("password-configured");
    } else if (result.errors) {
        Object.keys(result.errors).forEach((field) => {
            if (errors.hasOwnProperty(field)) {
                errors[field] = result.errors[field];
            }
        });
    }
}

onMounted(async () => {
    await nextTick();
    passwordInput.value?.focus();
});
</script>

<template>
    <Modal title="Setup Application Password" @close="emit('close')">
        <div class="text-center mb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Welcome to Calendar!</h3>
            <p class="text-sm text-gray-600">
                To secure your calendar application, please create an admin password.
            </p>
        </div>

        <FormGroup label="Admin Password" required input-id="password" :error="errors.password">
            <Input
                id="password"
                v-model="password"
                type="password"
                placeholder="Enter admin password (min 8 characters)"
                required
                ref="passwordInput"
                @keyup.enter="handleSetupPassword"
            />
        </FormGroup>

        <FormGroup
            label="Confirm Password"
            required
            input-id="confirmPassword"
            :error="errors.confirmPassword"
        >
            <Input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm admin password"
                required
                @keyup.enter="handleSetupPassword"
            />
        </FormGroup>

        <template #footer>
            <div class="flex gap-2 justify-end">
                <Button
                    @click="handleSetupPassword"
                    :disabled="isLoading || !password || !confirmPassword"
                    variant="primary"
                >
                    {{ isLoading ? "Configuring..." : "Configure Password" }}
                </Button>
                <Button @click="emit('close')" :disabled="isLoading">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
