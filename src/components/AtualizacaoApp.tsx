import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// Versão embutida nesta build (definida em vite.config.ts via `define`).
declare const __APP_VERSION__: string;

const POLL_MS = 3 * 60 * 1000; // verifica a cada 3 minutos

// Detecta que houve um novo deploy comparando a versão embutida no bundle com a
// publicada em /version.json. Quando muda, oferece atualização (e aplica sozinho
// assim que o usuário voltar para a aba/app) — garante que melhorias cheguem ao
// app instalado como PWA, que pode ficar aberto por muito tempo.
export default function AtualizacaoApp() {
  const [novaVersao, setNovaVersao] = useState(false);
  const aplicandoRef = useRef(false);

  const versaoAtual = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

  const checar = useCallback(async () => {
    // pede ao navegador para revalidar o service worker
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      reg?.update();
    } catch { /* */ }
    try {
      const resp = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data?.version && versaoAtual && String(data.version) !== String(versaoAtual)) {
        setNovaVersao(true);
      }
    } catch { /* offline — ignora */ }
  }, [versaoAtual]);

  const aplicar = useCallback(async () => {
    if (aplicandoRef.current) return;
    aplicandoRef.current = true;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      reg?.waiting?.postMessage('SKIP_WAITING');
    } catch { /* */ }
    // Recarrega buscando da rede (o SW não faz cache, então virá a versão nova).
    window.location.reload();
  }, []);

  useEffect(() => {
    checar();
    const id = window.setInterval(checar, POLL_MS);
    const onVisivel = () => {
      if (document.visibilityState !== 'visible') return;
      // Se já detectamos versão nova e o usuário voltou à aba/app, atualiza sozinho.
      if (novaVersao) aplicar();
      else checar();
    };
    document.addEventListener('visibilitychange', onVisivel);
    window.addEventListener('online', checar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisivel);
      window.removeEventListener('online', checar);
    };
  }, [checar, aplicar, novaVersao]);

  if (!novaVersao) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-full bg-[#1e3a5f] text-white shadow-lg border border-white/15 pl-4 pr-2 py-2 text-sm">
      <RefreshCw size={15} className="text-blue-200" />
      <span>Nova versão do sistema disponível.</span>
      <button
        onClick={aplicar}
        className="rounded-full bg-white text-[#1e3a5f] font-semibold text-xs px-3 py-1 hover:bg-blue-50 transition-colors"
      >
        Atualizar agora
      </button>
    </div>
  );
}
