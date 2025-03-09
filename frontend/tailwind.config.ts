import { nextui } from '@nextui-org/react';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // ====== 浅色主题 (Light Theme) ======
        'light-bg': '#FFFFFF',         // 主背景
        'light-sidebar': '#F4F4F4',    // 侧边栏背景
        'light-card': '#FFFFFF',       // 卡片背景
        'light-text': '#000000',       // 主要文字
        'light-subtext': '#4F4F4F',    // 次要文字/提示

        // ====== 深色主题 (Dark Theme) ======
        'dark-bg': '#141414',         // 主背景
        'dark-sidebar': '#000000',    // 侧边栏背景
        'dark-card': '#1F1F1F',       // 卡片背景
        'dark-text': '#FFFFFF',       // 主要文字
        'dark-subtext': '#BFBFBF',    // 次要文字/提示

        // ====== 其他可能需要的配色 ======
        'brand': '#6C63FF',           // 品牌色（示例）
        'chart-line': '#00D8FF',      // 折线图颜色（示例）
      },
    },
  },
  darkMode: "class",
  mode: 'jit',
  plugins: []
}