// https://umijs.org/config/
import { defineConfig } from 'umi';

export default defineConfig({
  define: {
    API_ENV: {
      ENV: 'production',
      // base api
      APP_BASE_API: 'http://localhost:5000/',
    },
  },
});
