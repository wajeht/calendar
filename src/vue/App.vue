<script setup>
import { onMounted } from "vue";
import Toast from "./components/Toast.vue";
import Calendar from "./components/Calendar.vue";
import { useToast } from "./composables/useToast.js";

const toast = useToast();

onMounted(() => {
    const path = window.location.pathname;
    if (path !== "/") {
        toast.error(`Page not found: ${path}`, "Not Found");
        window.history.replaceState({}, "", "/");
    }
});
</script>

<template>
    <Calendar />
    <Toast />
</template>
