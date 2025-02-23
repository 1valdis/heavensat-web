import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import { viteStaticCopy } from "vite-plugin-static-copy";
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    // depending on your application, base can also be "/"
    base: '/heavensat-web',
    publicDir: 'public',
    plugins: [react(), viteTsconfigPaths(), crossOriginIsolation(), /*viteStaticCopy({
      targets: [
          {
              src: "node_modules/coi-serviceworker/coi-serviceworker.min.js",
              dest: ".",
          },
      ],
  }),*//*, VitePWA({
      base: '/heavensat-web',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "Heavensat Web",
        short_name: "Heavensat Web",
        description: "Everything for satellite observation",
        theme_color: "#000000",
        icons: [{
          "src": "pwa-192x192.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "pwa-512x512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "pwa-maskable-192x192.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "maskable"
        },
        {
          "src": "pwa-maskable-512x512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "maskable"
        }]
      }
    })*/],
    server: {    
        // this ensures that the browser opens upon server start
        open: true,
        // this sets a default port to 3000  
        port: 3000, 
    },
    worker: {
      format: "es"
    }
})
