import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const entrar = async () => {
    setErro('');
    if (!email.trim() || !senha) { setErro('Informe e-mail e senha.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    setLoading(false);
    if (error) {
      setErro(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message
      );
    }
    // sucesso: o AuthGate detecta a sessão e abre o sistema
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] flex items-center justify-center mb-3">
            <Scale size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#1e3a5f]">JurisGest Pro</h1>
          <p className="text-sm text-gray-500">Gestão jurídica do escritório</p>
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Entrar no sistema</p>
            <p className="text-xs text-gray-500">Use seu e-mail e senha de acesso.</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">E-mail</Label>
            <Input
              type="email" autoComplete="email" className="h-9 text-sm"
              placeholder="seu@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Senha</Label>
            <div className="relative">
              <Input
                type={showSenha ? 'text' : 'password'} autoComplete="current-password"
                className="h-9 text-sm pr-9" placeholder="••••••••" value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && entrar()}
              />
              <button type="button" className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600" onClick={() => setShowSenha(s => !s)}>
                {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">{erro}</p>}

          <Button className="w-full h-9 bg-[#2563eb] hover:bg-blue-700 text-sm" onClick={entrar} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin mr-1" /> : null}
            Entrar
          </Button>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-4">
          Acesso restrito. Dados visíveis apenas após autenticação.
        </p>
      </div>
    </div>
  );
}
