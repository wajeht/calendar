import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: "/",
        name: "Calendar",
        component: () => import("./pages/Calendar.vue"),
        meta: { title: "Calendar" },
    },
    {
        path: "/:pathMatch(.*)*",
        name: "catch-all",
        component: () => import("./pages/Error.vue"),
        meta: { title: "Error" },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(_to, _from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        }

        return { top: 0 };
    },
});

export { router };
