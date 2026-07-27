// Service worker do JurisGest Pro — v3 (auto-update).
// NÃO faz cache: cada requisição vai direto à rede, para nunca servir uma versão
// desatualizada após um deploy. A troca de VERSION a cada mudança relevante deste
// arquivo força o navegador a reinstalar o SW.
const VERSION = 'v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Permite ao app pedir a ativação imediata de uma nova versão do SW.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Sempre rede. Se estiver offline, devolve uma resposta neutra em vez de estourar.
  event.respondWith(
    fetch(event.request).catch(() => new Response('', { status: 504, statusText: 'offline' })),
  );
});
