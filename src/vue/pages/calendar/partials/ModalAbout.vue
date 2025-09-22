<script setup>
import Modal from "../../../components/Modal.vue";
import Button from "../../../components/Button.vue";

const emit = defineEmits(["close"]);

function openGitHubRepository() {
    return window.open("https://github.com/wajeht/calendar", "_blank");
}
</script>

<template>
    <Modal title="About Calendar" @close="emit('close')">
        <div class="text-center">
            <div class="mb-4">
                <h3 class="text-base font-bold text-gray-800 mb-2">Calendar</h3>
                <p class="text-[13px] text-gray-600 leading-tight">
                    A web-based calendar application with multiple calendar source support via
                    iCal/WebCal URLs
                </p>
            </div>

            <div class="mb-4">
                <p class="text-[13px] text-gray-600">
                    Made with ❤️ by
                    <a
                        href="https://github.com/wajeht"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-gray-800 hover:text-gray-900 font-normal"
                    >
                        @wajeht
                    </a>
                </p>
                <p class="text-[13px] text-gray-600 mt-1">
                    Questions or feedback?
                    <a
                        href="mailto:github@jaw.dev"
                        class="text-gray-800 hover:text-gray-900 underline"
                    >
                        Drop me a line
                    </a>
                    or
                    <a
                        href="https://github.com/wajeht/calendar/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-gray-800 hover:text-gray-900 underline"
                    >
                        create an issue
                    </a>
                    on GitHub
                </p>
            </div>

            <div>
                <Button variant="primary" @click="openGitHubRepository"> View on GitHub </Button>
            </div>
        </div>

        <template #footer>
            <Button @click="emit('close')">Close</Button>
        </template>
    </Modal>
</template>
