import { createRouter, createWebHistory } from "vue-router";
import ConfigView from "./views/ConfigView.vue";
import DashboardView from "./views/DashboardView.vue";
import SummaryView from "./views/SummaryView.vue";
import ReportView from "./views/ReportView.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "config", component: ConfigView },
    { path: "/config", name: "config-alias", component: ConfigView },
    { path: "/dashboard", name: "dashboard", component: DashboardView },
    { path: "/summary", name: "summary", component: SummaryView },
    { path: "/report/:reportId?", name: "report", component: ReportView }
  ]
});
