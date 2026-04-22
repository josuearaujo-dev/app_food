import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Diretório deste repositório (evita 404 quando existe outro lockfile em pasta pai, ex.: ~/Downloads/pnpm-lock.yaml). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
    /** Evita resolver tailwind/postcss a partir da pasta errada (ex.: ~/Downloads) quando há lockfile no pai. */
    resolveAlias: {
      tailwindcss: path.join(projectRoot, 'node_modules/tailwindcss'),
      '@tailwindcss/postcss': path.join(
        projectRoot,
        'node_modules/@tailwindcss/postcss'
      ),
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
