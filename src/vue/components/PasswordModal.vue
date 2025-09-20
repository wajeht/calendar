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
            <Button variant="primary" @click="authenticate">Login</Button>
            <Button @click="$emit('close')">Cancel</Button>
        </template>
    </Modal>
</template>

<script setup>
import { ref, nextTick, onMounted } from "vue";
import { useToast } from "../toast";
import Modal from "./ui/Modal.vue";
import FormGroup from "./ui/FormGroup.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";

const emit = defineEmits(["close", "authenticated"]);
const toast = useToast();

const password = ref("");
const passwordInput = ref();

async function authenticate() {
    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: password.value }),
        });

        if (response.ok) {
            emit("authenticated");
        } else {
            toast.error("Invalid password");
        }
    } catch (error) {
        toast.error("Authentication error: " + error.message);
    }
}

onMounted(async () => {
    await nextTick();
    passwordInput.value?.focus();
});
</script>
