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
        }
    } catch (error) {
        toast.error("Authentication error: " + error.message);
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
    <Modal title="Authentication Required" high-z-index @close="emit('close')">
        <FormGroup label="Password" required input-id="password" :error="errors.password">
            <Input
                id="password"
                v-model="password"
                type="password"
                placeholder="Enter password"
                required
                ref="passwordInput"
                @keyup.enter="authenticate"
            />
        </FormGroup>

        <template #footer>
            <Button variant="primary" @click="authenticate" :disabled="isLoading">
                {{ isLoading ? "Logging in..." : "Login" }}
            </Button>
            <Button @click="emit('close')" :disabled="isLoading">Cancel</Button>
        </template>
    </Modal>
</template>
