<template>
    <div class="modal-overlay" @click="$emit('close')">
        <div class="modal" @click.stop>
            <div class="modal-header">
                <h2>Authentication Required</h2>
                <button class="modal-close" @click="$emit('close')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        v-model="password"
                        @keyup.enter="authenticate"
                        placeholder="Enter password"
                        class="form-control"
                        required
                        ref="passwordInput"
                    />
                </div>
            </div>
            <div class="modal-footer">
                <button @click="authenticate" class="btn btn-primary">Login</button>
                <button @click="$emit('close')" class="btn">Cancel</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from "vue";
import { useToast } from "../toast";

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
