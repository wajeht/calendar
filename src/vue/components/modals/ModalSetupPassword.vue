<script setup>
import { ref, reactive, nextTick, onMounted, useTemplateRef } from "vue";
import Modal from "../../components/Modal.vue";
import FormGroup from "../../components/FormGroup.vue";
import Input from "../../components/Input.vue";
import Button from "../../components/Button.vue";
import { api } from "../../api.js";
import { useToast } from "../../composables/useToast";

const emit = defineEmits(["close", "password-configured"]);
const toast = useToast();
const isLoading = ref(false);

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
    isLoading.value = true;
    try {
        const result = await api.auth.setupPassword(password.value, confirmPassword.value);
        if (result.success) {
            toast.success(
                result.message || "Password configured successfully! You can now log in.",
            );
            emit("password-configured");
        } else {
            toast.error(result.message || "Failed to configure password");
            if (result.errors) {
                Object.keys(result.errors).forEach((field) => {
                    if (errors.hasOwnProperty(field)) {
                        errors[field] = result.errors[field];
                    }
                });
            }
        }
    } catch (error) {
        toast.error("Failed to configure password: " + error.message);
    } finally {
        isLoading.value = false;
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
                :disabled="isLoading"
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
                :disabled="isLoading"
                @keyup.enter="handleSetupPassword"
            />
        </FormGroup>

        <template #footer>
            <div class="flex gap-2 justify-end">
                <Button
                    @click="handleSetupPassword"
                    :loading="isLoading"
                    :disabled="!password || !confirmPassword"
                    variant="primary"
                >
                    Configure Password
                </Button>
                <Button @click="emit('close')" :disabled="isLoading">Cancel</Button>
            </div>
        </template>
    </Modal>
</template>
