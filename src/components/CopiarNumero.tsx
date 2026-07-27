import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

// Copia um número de processo para a área de transferência (com feedback via toast).
// Reutilizável em todo o sistema — sempre que um número de processo for exibido.
export function copiarNumeroProcesso(numero?: string) {
  const n = (numero || '').trim();
  if (!n) { toast.error('Processo sem número para copiar.'); return; }
  if (!navigator.clipboard?.writeText) { toast.error('Não foi possível copiar.'); return; }
  navigator.clipboard.writeText(n)
    .then(() => toast.success('Número do processo copiado.'))
    .catch(() => toast.error('Não foi possível copiar.'));
}

// Botão-ícone padrão de "copiar número do processo". Não dispara cliques do container
// (stopPropagation), então pode ficar dentro de cards/linhas clicáveis com segurança.
export function CopiarNumero({
  numero,
  size = 12,
  className = '',
}: {
  numero?: string;
  size?: number;
  className?: string;
}) {
  const [ok, setOk] = useState(false);
  if (!(numero || '').trim()) return null;
  return (
    <button
      type="button"
      title="Copiar número do processo"
      aria-label="Copiar número do processo"
      className={`text-gray-400 hover:text-[#1e3a5f] transition-colors flex-shrink-0 inline-flex items-center align-middle ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        copiarNumeroProcesso(numero);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
    >
      {ok ? <Check size={size} className="text-green-600" /> : <Copy size={size} />}
    </button>
  );
}
