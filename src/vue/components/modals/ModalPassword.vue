<script setup>
import { ref, reactive, nextTick, onMounted, useTemplateRef } from "vue";
import Modal from "../../components/Modal.vue";
import FormGroup from "../../components/FormGroup.vue";
import Input from "../../components/Input.vue";
import Button from "../../components/Button.vue";
import { api } from "../../api.js";
import { useToast } from "../../composables/useToast";
import { useAuthStore } from "../../composables/useAuthStore.js";

const CAP_WIDGET_SRC = "https://cdn.jsdelivr.net/npm/@cap.js/widget@0.1.56";

const emit = defineEmits(["close", "authenticated"]);
const toast = useToast();
const auth = useAuthStore();
const isLoading = ref(false);

const password = ref("");
const passwordInput = useTemplateRef("passwordInput");
const capWidget = useTemplateRef("capWidget");
const capToken = ref("");

const errors = reactive({
    password: "",
});

function loadCapWidget() {
    if (!auth.cap.value?.enabled) return;
    if (document.querySelector(`script[src="${CAP_WIDGET_SRC}"]`)) return;

    const script = document.createElement("script");
    script.src = CAP_WIDGET_SRC;
    script.defer = true;
    document.head.appendChild(script);
}

function onCapSolve(event) {
    capToken.value = event.detail?.token || "";
    errors.password = "";
}

function onCapReset() {
    capToken.value = "";
}

async function authenticate() {
    if (isLoading.value) return;

    errors.password = "";

    if (auth.cap.value?.enabled && !capToken.value) {
        errors.password = "Please complete the captcha";
        return;
    }

    isLoading.value = true;
    try {
        const result = await api.auth.login(password.value, capToken.value || undefined);
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
            resetCapWidget();
            await nextTick();
            passwordInput.value?.focus();
            return;
        }
    } catch (error) {
        toast.error("Authentication error: " + error.message);
        isLoading.value = false;

        password.value = "";
        resetCapWidget();
        await nextTick();
        passwordInput.value?.focus();
        return;
    }
    isLoading.value = false;
}

// Cap tokens are single-use — after a failed login the widget must be re-solved
function resetCapWidget() {
    capToken.value = "";
    capWidget.value?.reset?.();
}

onMounted(async () => {
    loadCapWidget();
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

            <cap-widget
                v-if="auth.cap.value?.enabled"
                ref="capWidget"
                :data-cap-api-endpoint="auth.cap.value.apiEndpoint"
                style="display: block; width: 100%; --cap-widget-width: 100%"
                @solve="onCapSolve"
                @reset="onCapReset"
                @error="onCapReset"
            ></cap-widget>
        </form>

        <template #footer>
            <Button variant="primary" @click="authenticate" :loading="isLoading"> Login </Button>
            <Button @click="emit('close')" :disabled="isLoading">Cancel</Button>
        </template>
    </Modal>
</template>
