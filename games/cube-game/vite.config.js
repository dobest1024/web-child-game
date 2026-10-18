import { defineConfig } from 'vite';

// cubing loads puzzle definitions dynamically, including inside the lesson worker.
export default defineConfig({ worker: { format: 'es' } });
