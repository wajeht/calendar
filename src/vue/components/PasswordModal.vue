<template>
    <div class="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-60 z-[3000]" @click="$emit('close')">
        <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-sm shadow-lg z-[3001] max-w-[700px] w-[90%] max-h-[85vh] overflow-hidden text-[13px] leading-tight" @click.stop style="font-family: 'Lucida Grande', Helvetica, Arial, Verdana, sans-serif;">
            <div class="bg-gray-100 border-b border-gray-300 p-4 relative">
                <h2 class="m-0 text-base font-bold text-gray-800">Authentication Required</h2>
                <button class="absolute top-1/2 right-4 transform -translate-y-1/2 bg-none border-none text-lg cursor-pointer text-gray-500 p-0 w-5 h-5 flex items-center justify-center hover:text-gray-800" @click="$emit('close')">&times;</button>
            </div>
            <div class="p-5 max-h-[calc(85vh-140px)] overflow-y-auto">
                <div class="mb-4">
                    <label for="password" class="block mb-1 font-bold text-gray-800 text-[13px]">Password:</label>
                    <input
                        type="password"
                        id="password"
                        v-model="password"
                        @keyup.enter="authenticate"
                        placeholder="Enter password"
                        class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]"
                        required
                        ref="passwordInput"
                        style="font-family: inherit;"
                    />
                </div>
            </div>
            <div class="bg-gray-100 border-t border-gray-300 p-4 text-right">
                <button @click="authenticate" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-white bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-700 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-slate-800 hover:to-slate-700 hover:border-slate-700" style="font-family: inherit;">Login</button>
                <button @click="$emit('close')" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-gray-800 bg-gradient-to-b from-white to-gray-200 border border-gray-300 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-gray-200 hover:to-gray-300 hover:border-gray-400" style="font-family: inherit;">Cancel</button>
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
