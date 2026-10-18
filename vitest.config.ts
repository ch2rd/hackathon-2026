import { defineConfig } from 'vitest/config';

// 测试环境配置（B 搭的基建；include 同时覆盖 B 的 src/** 与 C 的 tests/**）
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
