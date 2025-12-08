<script setup>
import { computed } from "vue";
import Modal from "../../components/Modal.vue";
import Button from "../../components/Button.vue";

const props = defineProps({
    event: {
        type: Object,
        default: null,
    },
    calendar: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(["close"]);

function formatEventDate(date, allDay = false) {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: allDay ? undefined : "2-digit",
        minute: allDay ? undefined : "2-digit",
    });
}

function linkify(text) {
    if (!text) return text;

    const words = text.split(/(\s+)/);
    const resultWords = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (/^\s+$/.test(word)) {
            resultWords[i] = word;
            continue;
        }

        let potentialContact = word;
        let trailingPunctuation = "";

        const punctuationMatch = word.match(/^(.+?)([.,;:!?)\]}>]+)$/);
        if (punctuationMatch) {
            potentialContact = punctuationMatch[1];
            trailingPunctuation = punctuationMatch[2];
        }

        // Email detection
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (emailRegex.test(potentialContact)) {
            resultWords[i] =
                `<a class="hover:underline" href="mailto:${potentialContact}">${potentialContact}</a>${trailingPunctuation}`;
            continue;
        }

        // Phone number detection
        const phoneRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
        const phoneMatch = potentialContact.match(phoneRegex);
        if (phoneMatch) {
            const cleanPhone = potentialContact.replace(/[^\d+]/g, "");
            resultWords[i] =
                `<a class="hover:underline" href="tel:${cleanPhone}">${potentialContact}</a>${trailingPunctuation}`;
            continue;
        }

        // URL detection
        try {
            const url = new URL(potentialContact);
            if (url.protocol === "http:" || url.protocol === "https:") {
                resultWords[i] =
                    `<a class="hover:underline" href="${url.href}" target="_blank" rel="noopener noreferrer">${potentialContact}</a>${trailingPunctuation}`;
                continue;
            }
        } catch (e) {}

        resultWords[i] = word;
    }
    return resultWords.join("");
}

const formattedStartDate = computed(() => {
    return props.event?.start ? formatEventDate(props.event.start, props.event?.allDay) : "";
});

const formattedEndDate = computed(() => {
    return props.event?.end ? formatEventDate(props.event.end, props.event?.allDay) : "";
});

const duration = computed(() => {
    if (!props.event?.start || !props.event?.end || props.event?.allDay) return null;

    const durationMs = new Date(props.event.end) - new Date(props.event.start);
    const durationMinutes = durationMs / 1000 / 60;

    if (durationMinutes < 60) {
        return `${durationMinutes} minutes`;
    } else {
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        return `${hours}h ${mins > 0 ? mins + "m" : ""}`;
    }
});

const attendeeEmails = computed(() => {
    if (!props.event?.extendedProps?.attendeeEmails) return [];
    return props.event.extendedProps.attendeeEmails.split(", ");
});

const linkedDescription = computed(() => {
    return props.event?.extendedProps?.description
        ? linkify(props.event.extendedProps.description)
        : "";
});

const linkedLocation = computed(() => {
    return props.event?.extendedProps?.location ? linkify(props.event.extendedProps.location) : "";
});
</script>

<template>
    <Modal title="Event Details" @close="emit('close')">
        <div v-if="props.event" class="space-y-3 text-gray-800 dark:text-gray-200">
            <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                {{ props.event.title || "Event Details" }}
            </h3>

            <div class="space-y-2 text-sm">
                <!-- All day indicator -->
                <div v-if="props.event.allDay" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >When:</span
                    >
                    <span>All day event</span>
                </div>

                <!-- Start time -->
                <div class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Start:</span
                    >
                    <span>{{ formattedStartDate }}</span>
                </div>

                <!-- End time -->
                <div v-if="props.event.end" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >End:</span
                    >
                    <span>{{ formattedEndDate }}</span>
                </div>

                <!-- Duration -->
                <div v-if="duration" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Duration:</span
                    >
                    <span>{{ duration }}</span>
                </div>

                <!-- Location -->
                <div v-if="linkedLocation" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Location:</span
                    >
                    <span v-html="linkedLocation"></span>
                </div>

                <!-- Description -->
                <div v-if="linkedDescription" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Description:</span
                    >
                    <div v-html="linkedDescription" class="inline"></div>
                </div>

                <!-- Status -->
                <div v-if="props.event.extendedProps?.status" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Status:</span
                    >
                    <span>{{ props.event.extendedProps.status }}</span>
                </div>

                <!-- Organizer -->
                <div
                    v-if="
                        props.event.extendedProps?.organizerEmail ||
                        props.event.extendedProps?.organizerName
                    "
                    class="mb-2"
                >
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Organizer:</span
                    >
                    <span v-if="props.event.extendedProps.organizerName">{{
                        props.event.extendedProps.organizerName
                    }}</span>
                    <span
                        v-if="
                            props.event.extendedProps.organizerName &&
                            props.event.extendedProps.organizerEmail
                        "
                    >
                        (</span
                    >
                    <a
                        v-if="props.event.extendedProps.organizerEmail"
                        :href="`mailto:${props.event.extendedProps.organizerEmail}`"
                        >{{ props.event.extendedProps.organizerEmail }}</a
                    >
                    <span
                        v-if="
                            props.event.extendedProps.organizerName &&
                            props.event.extendedProps.organizerEmail
                        "
                        >)</span
                    >
                </div>

                <!-- Attendees -->
                <div
                    v-if="
                        props.event.extendedProps?.attendeeCount &&
                        parseInt(props.event.extendedProps.attendeeCount) > 0
                    "
                    class="mb-2"
                >
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Attendees:</span
                    >
                    <span>{{ props.event.extendedProps.attendeeCount }} attendee(s)</span>
                </div>

                <!-- Attendee names -->
                <div v-if="props.event.extendedProps?.attendeeNames" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Names:</span
                    >
                    <span>{{
                        props.event.extendedProps.attendeeNames
                            .split(",")
                            .map((m) => m.split("@")[0])
                            .join(",")
                    }}</span>
                </div>

                <!-- Attendee emails -->
                <div v-if="attendeeEmails.length > 0" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Emails:</span
                    >
                    <span>
                        <template v-for="(email, index) in attendeeEmails" :key="email">
                            <a class="hover:underline" :href="`mailto:${email}`">{{ email }}</a>
                            <span v-if="index < attendeeEmails.length - 1">, </span>
                        </template>
                    </span>
                </div>

                <!-- Transparency -->
                <div v-if="props.event.extendedProps?.transparency" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Show as:</span
                    >
                    <span>{{
                        props.event.extendedProps.transparency === "OPAQUE" ? "Busy" : "Free"
                    }}</span>
                </div>

                <!-- Created -->
                <div v-if="props.event.extendedProps?.created" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Created:</span
                    >
                    <span>{{ new Date(props.event.extendedProps.created).toLocaleString() }}</span>
                </div>

                <!-- Last Modified -->
                <div v-if="props.event.extendedProps?.lastModified" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Modified:</span
                    >
                    <span>{{
                        new Date(props.event.extendedProps.lastModified).toLocaleString()
                    }}</span>
                </div>

                <!-- Event UID -->
                <div v-if="props.event.extendedProps?.uid" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Event ID:</span
                    >
                    <code
                        class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all"
                        >{{ props.event.extendedProps.uid }}</code
                    >
                </div>

                <!-- Calendar -->
                <div v-if="props.calendar" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Calendar:</span
                    >
                    <span class="inline-flex items-center">
                        <span
                            class="inline-block w-3 h-3 rounded-sm mr-2"
                            :style="{ backgroundColor: props.calendar.color }"
                        ></span>
                        {{ props.calendar.name }}
                    </span>
                </div>

                <!-- Event URL -->
                <div v-if="props.event.url" class="mb-2">
                    <span
                        class="font-bold text-gray-800 dark:text-gray-200 mr-2 inline-block min-w-[80px]"
                        >Link:</span
                    >
                    <a
                        :href="props.event.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-600 dark:text-blue-400 hover:underline"
                        >Open in calendar</a
                    >
                </div>
            </div>
        </div>

        <template #footer>
            <Button @click="emit('close')">Close</Button>
        </template>
    </Modal>
</template>
