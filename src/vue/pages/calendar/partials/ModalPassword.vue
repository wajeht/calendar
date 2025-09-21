<script setup>
import { ref, reactive, nextTick, onMounted, useTemplateRef } from "vue";
import Modal from "../../../components/Modal.vue";
import FormGroup from "../../../components/FormGroup.vue";
import Input from "../../../components/Input.vue";
import Button from "../../../components/Button.vue";
import { useAuth } from "../../../composables/useAuth.js";

const emit = defineEmits(["close", "authenticated"]);
const { login, isLoading } = useAuth();

const password = ref("");
const passwordInput = useTemplateRef("passwordInput");

const errors = reactive({
    password: "",
});

async function authenticate() {
    errors.password = "";

    const result = await login(password.value);
    if (result.success) {
        emit("authenticated");
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
    <Modal title="Authentication Required" @close="emit('close')">
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
