import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  solicitarRecuperacao,
  verificarCodigoRecuperacao,
  redefinirSenha,
} from '@/services/recuperacaoSenha';
import { maskCpfCnpj } from '@/lib/mask';
import { ApiError } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import LogoMark from '@/components/empresa/LogoMark';

type Etapa = 'documento' | 'codigo' | 'novaSenha';

const STEPS: Etapa[] = ['documento', 'codigo', 'novaSenha'];

const COPY: Record<Etapa, { title: string; subtitle: (emailHint: string) => string }> = {
  documento: {
    title: 'Recuperar senha',
    subtitle: () => 'Informe o CPF ou CNPJ da sua empresa para receber o código de recuperação por e-mail.',
  },
  codigo: {
    title: 'Verificar código',
    subtitle: hint => `Digite o código de 6 dígitos enviado para ${hint || 'seu e-mail'}.`,
  },
  novaSenha: {
    title: 'Nova senha',
    subtitle: () => 'Crie uma nova senha para sua conta.',
  },
};

export default function EsqueceuSenhaPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('documento');
  const [documento, setDocumento] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doc = documento.replace(/\D/g, '');

  async function enviarCodigo() {
    if (!doc) {
      setErro('Informe o CPF ou CNPJ.');
      return;
    }
    setErro(null);
    setLoading(true);
    try {
      const res = await solicitarRecuperacao(doc);
      if (res.email_hint) setEmailHint(res.email_hint);
      setEtapa('codigo');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  }

  async function verificarCodigo() {
    if (!codigo || codigo.length < 6) {
      setErro('Digite o código de 6 dígitos.');
      return;
    }
    setErro(null);
    setLoading(true);
    try {
      const res = await verificarCodigoRecuperacao(doc, codigo);
      setResetToken(res.reset_token);
      setEtapa('novaSenha');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Código inválido.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRedefinir() {
    if (!novaSenha || novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    setErro(null);
    setLoading(true);
    try {
      await redefinirSenha(resetToken, novaSenha);
      navigate('/empresa/login', { replace: true });
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  const copy = COPY[etapa];
  const stepIndex = STEPS.indexOf(etapa);

  return (
    <div className="min-h-screen bg-matriz flex items-center justify-center px-6 py-10 relative overflow-hidden">
      {/* Blobs decorativos — mesmos do login, pra manter a identidade visual */}
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-pulso/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] bg-emerald-400/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-sm flex flex-col gap-6">
        <button
          type="button"
          onClick={() => navigate('/empresa/login')}
          className="self-start text-[13px] font-semibold text-pulso"
        >
          ← Voltar
        </button>

        <div className="flex flex-col items-center gap-2.5">
          <LogoMark />
          <h1 className="text-[28px] font-bold text-clareza tracking-tight">Unik Logística</h1>
        </div>

        <div className="rounded-2xl bg-white/[0.07] backdrop-blur-2xl border border-white/10 p-7 shadow-2xl shadow-black/40">
          <h2 className="text-lg font-bold text-clareza mb-1.5">{copy.title}</h2>
          <p className="text-[13px] text-gray leading-relaxed mb-6">{copy.subtitle(emailHint)}</p>

          {etapa === 'documento' && (
            <>
              <div className="mb-4">
                <label htmlFor="doc" className="block text-xs font-semibold text-clareza/80 mb-1.5">
                  CPF ou CNPJ
                </label>
                <input
                  id="doc"
                  value={documento}
                  onChange={e => setDocumento(maskCpfCnpj(e.target.value))}
                  placeholder="CPF ou CNPJ"
                  inputMode="numeric"
                  autoComplete="username"
                  className="h-[50px] w-full rounded-xl border border-white/10 bg-white/5 px-4 text-[15px] text-clareza placeholder:text-gray outline-none focus:border-pulso/70 focus:bg-white/[0.07] transition-colors"
                />
              </div>
              {erro && <p className="mb-4 text-sm font-medium text-danger">{erro}</p>}
              <button
                onClick={enviarCodigo}
                disabled={loading}
                className="flex h-[52px] w-full items-center justify-center rounded-xl bg-pulso font-bold text-clareza shadow-lg shadow-pulso/40 transition-opacity disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar código'}
              </button>
            </>
          )}

          {etapa === 'codigo' && (
            <>
              <div className="mb-4">
                <label htmlFor="codigo" className="block text-xs font-semibold text-clareza/80 mb-1.5">
                  Código de verificação
                </label>
                <input
                  id="codigo"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  className="h-[50px] w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-2xl font-bold tracking-[8px] text-clareza placeholder:text-gray outline-none focus:border-pulso/70 focus:bg-white/[0.07] transition-colors"
                />
              </div>
              {erro && <p className="mb-4 text-sm font-medium text-danger">{erro}</p>}
              <button
                onClick={verificarCodigo}
                disabled={loading}
                className="flex h-[52px] w-full items-center justify-center rounded-xl bg-pulso font-bold text-clareza shadow-lg shadow-pulso/40 transition-opacity disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verificar'}
              </button>
              <button
                onClick={() => {
                  setCodigo('');
                  enviarCodigo();
                }}
                className="mt-4 block w-full text-center text-[13px] font-semibold text-pulso"
              >
                Reenviar código
              </button>
            </>
          )}

          {etapa === 'novaSenha' && (
            <>
              <div className="mb-4">
                <label htmlFor="novaSenha" className="block text-xs font-semibold text-clareza/80 mb-1.5">
                  Nova senha
                </label>
                <div className="flex h-[50px] items-center rounded-xl border border-white/10 bg-white/5 focus-within:border-pulso/70 focus-within:bg-white/[0.07] transition-colors">
                  <input
                    id="novaSenha"
                    type={showSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-full flex-1 bg-transparent px-4 text-[15px] text-clareza placeholder:text-gray outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="px-3.5 text-gray"
                    aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="mb-2">
                <label htmlFor="confirmarSenha" className="block text-xs font-semibold text-clareza/80 mb-1.5">
                  Confirmar senha
                </label>
                <div className="flex h-[50px] items-center rounded-xl border border-white/10 bg-white/5 focus-within:border-pulso/70 focus-within:bg-white/[0.07] transition-colors">
                  <input
                    id="confirmarSenha"
                    type={showConfirmar ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={e => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-full flex-1 bg-transparent px-4 text-[15px] text-clareza placeholder:text-gray outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar(!showConfirmar)}
                    className="px-3.5 text-gray"
                    aria-label={showConfirmar ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmar ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="mb-2 text-xs text-danger">As senhas não coincidem</p>
              )}
              {erro && <p className="mb-4 text-sm font-medium text-danger">{erro}</p>}
              <button
                onClick={handleRedefinir}
                disabled={loading}
                className="mt-4 flex h-[52px] w-full items-center justify-center rounded-xl bg-pulso font-bold text-clareza shadow-lg shadow-pulso/40 transition-opacity disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Redefinir senha'}
              </button>
            </>
          )}
        </div>

        <div className="flex justify-center gap-2 pb-2">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-1.5 rounded-full bg-white/15 transition-all',
                i === stepIndex ? 'w-6 bg-pulso' : i < stepIndex ? 'w-1.5 bg-pulso' : 'w-1.5',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
