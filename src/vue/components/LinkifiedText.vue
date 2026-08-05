<script setup>
import { computed } from "vue";
import { linkifyText } from "../utils/linkify.js";

const props = defineProps({
    text: {
        type: String,
        default: "",
    },
});

const parts = computed(() => linkifyText(props.text));
</script>

<template>
    <template v-for="(part, index) in parts" :key="index">
        <a
            v-if="part.href"
            class="hover:underline"
            :href="part.href"
            :target="part.external ? '_blank' : undefined"
            :rel="part.external ? 'noopener noreferrer' : undefined"
            >{{ part.text }}</a
        >
        <span v-else>{{ part.text }}</span>
    </template>
</template>
