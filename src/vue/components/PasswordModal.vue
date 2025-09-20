<script setup>
import { ref, nextTick, onMounted } from "vue";
import Modal from "./ui/modal/Modal.vue";
import FormGroup from "./ui/FormGroup.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";
import { useAuth } from "../composables/useAuth.js";

const emit = defineEmits(["close", "authenticated"]);
const { login, isLoading } = useAuth();

const password = ref("");
const passwordInput = ref();

async function authenticate() {
    const result = await login(password.value);
    if (result.success) {
        emit("authenticated");
    }
}

onMounted(async () => {
    await nextTick();
    passwordInput.value?.focus();
});
</script>

<template>
    <Modal title="Authentication Required" @close="$emit('close')">
        <FormGroup label="Password" required input-id="password">
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
                {{ isLoading ? 'Logging in...' : 'Login' }}
            </Button>
            <Button @click="$emit('close')" :disabled="isLoading">Cancel</Button>
        </template>
    </Modal>
</template>
