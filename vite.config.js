import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// این مقدار باید دقیقاً با اسم ریپازیتوری گیت‌هاب یکی باشد
// ریپازیتوری: https://github.com/USERNAME/tree-family
export default defineConfig({
  plugins: [react()],
  base: "/tree-family/",
});
