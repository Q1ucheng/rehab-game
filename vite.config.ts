import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 使用相对路径 './'，这样部署到任何 GitHub 仓库子路径都能正常访问资源
  // 这种方式适合不使用 BrowserRouter (History API) 的单页应用
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});