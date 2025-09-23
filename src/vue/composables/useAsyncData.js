import { ref, onBeforeUnmount } from "vue";

export function useAsyncData(fetcher, options = {}) {
    const { immediate = true } = options;

    const data = ref(null);
    const error = ref(null);
    const loading = ref(false);
    let controller = null;

    function abort() {
        if (controller) {
            controller.abort();
            controller = null;
        }
    }

    async function refresh() {
        abort();
        controller = new AbortController();
        loading.value = true;
        error.value = null;
        try {
            const result = await fetcher({ signal: controller.signal });
            data.value = result;
            return result;
        } catch (err) {
            if (err && err.name === "AbortError") return;
            error.value = err;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    onBeforeUnmount(() => abort());

    if (immediate) {
        void refresh();
    }

    return { data, error, loading, refresh, abort };
}
