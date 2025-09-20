<template>
    <div id="toast-container">
        <div
            v-for="toast in toastStore.toasts"
            :key="toast.id"
            :class="['toast', toast.type, { show: toast.show }]"
        >
            <div class="toast-content">
                <div class="toast-icon">{{ getIcon(toast.type) }}</div>
                <div class="toast-message">
                    <div v-if="toast.title" class="toast-title">{{ toast.title }}</div>
                    <div>{{ toast.message }}</div>
                </div>
            </div>
            <button class="toast-close" @click="toastStore.removeToast(toast.id)">&times;</button>
        </div>
    </div>
</template>

<script setup>
import { useToast } from "../toast";

const toastStore = useToast();

function getIcon(type) {
    const icons = {
        success: "✓",
        error: "✕",
        warning: "⚠",
        info: "ℹ",
    };
    return icons[type] || icons.info;
}
</script>

<style scoped>
#toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    pointer-events: none;
}

.toast {
    background: white;
    border: 1px solid #ddd;
    border-radius: 3px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    padding: 12px 16px;
    margin-bottom: 12px;
    min-width: 300px;
    max-width: 450px;
    pointer-events: auto;
    transform: translateX(100%);
    transition:
        transform 0.3s ease-in-out,
        opacity 0.3s ease-in-out;
    opacity: 0;
    position: relative;
    font-family: inherit;
}

.toast.show {
    transform: translateX(0);
    opacity: 1;
}

.toast.success {
    border-left: 3px solid var(--success-color);
}

.toast.error {
    border-left: 3px solid var(--danger-color);
}

.toast.warning {
    border-left: 3px solid var(--warning-color);
}

.toast.info {
    border-left: 3px solid var(--info-color);
}

.toast-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.toast-icon {
    font-size: 18px;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
}

.toast.success .toast-icon {
    color: var(--success-color);
}

.toast.error .toast-icon {
    color: var(--danger-color);
}

.toast.warning .toast-icon {
    color: var(--warning-color);
}

.toast.info .toast-icon {
    color: var(--info-color);
}

.toast-message {
    flex: 1;
    font-size: 13px;
    color: #333;
    line-height: 1.4;
}

.toast-title {
    font-weight: bold;
    margin-bottom: 4px;
    font-size: 14px;
    color: #333;
}

.toast-close {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: none;
    font-size: 16px;
    color: #999;
    cursor: pointer;
    padding: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    border-radius: 3px;
}

.toast-close:hover {
    color: #666;
    background: #f5f5f5;
}
</style>
