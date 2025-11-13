<script setup>
import { ref, reactive, nextTick, onMounted, useTemplateRef } from "vue";
import Modal from "../../components/Modal.vue";
import FormGroup from "../../components/FormGroup.vue";
import Input from "../../components/Input.vue";
import Button from "../../components/Button.vue";
import { api } from "../../api.js";
import { useToast } from "../../composables/useToast";

const emit = defineEmits(["close", "authenticated"]);
const toast = useToast();
const isLoading = ref(false);

const password = ref("");
const passwordInput = useTemplateRef("passwordInput");

const errors = reactive({
    password: "",
});

async function authenticate() {
    if (isLoading.value) return;

    errors.password = "";
    isLoading.value = true;
    try {
        const result = await api.auth.login(password.value);
        if (result.success) {
            toast.success(result.message || "Logged in successfully");
            setTimeout(() => {
                emit("authenticated");
            }, 100);
        } else {
            toast.error(result.message || "Invalid password");
            if (result.errors) {
                Object.keys(result.errors).forEach((field) => {
                    if (errors.hasOwnProperty(field)) {
                        errors[field] = result.errors[field];
                    }
                });
            }
            isLoading.value = false;

            password.value = "";
            await nextTick();
            passwordInput.value?.focus();
            return;
        }
    } catch (error) {
        toast.error("Authentication error: " + error.message);
        isLoading.value = false;

        password.value = "";
        await nextTick();
        passwordInput.value?.focus();
        return;
    }
    isLoading.value = false;
}

onMounted(async () => {
    await nextTick();
    passwordInput.value?.focus();
});
</script>

<template>
    <Modal title="Authentication Required" high-z-index @close="emit('close')">
        <form @submit.prevent="authenticate">
            <!-- Hidden username field for password managers -->
            <input
                type="text"
                name="username"
                autocomplete="username"
                value="admin"
                readonly
                aria-hidden="true"
                tabindex="-1"
                style="position: absolute; left: -9999px; width: 1px; height: 1px"
            />

            <FormGroup label="Password" required input-id="password" :error="errors.password">
                <Input
                    id="password"
                    v-model="password"
                    type="password"
                    placeholder="Enter password"
                    required
                    ref="passwordInput"
                    :disabled="isLoading"
                    autocomplete="current-password"
                    @keyup.enter="authenticate"
                />
            </FormGroup>
        </form>

        <template #footer>
            <Button variant="primary" @click="authenticate" :loading="isLoading"> Login </Button>
            <Button @click="emit('close')" :disabled="isLoading">Cancel</Button>
        </template>
    </Modal>
</template>
