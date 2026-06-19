import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  solicitarRecuperacao,
  verificarCodigoRecuperacao,
  redefinirSenha,
} from '@/services/recuperacaoSenha';
import { maskCnpj } from '@/lib/mask';
import { ApiError } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

type Etapa = 'documento' | 'codigo' | 'novaSenha';

const STEPS: Etapa[] = ['documento', 'codigo', 'novaSenha'];

const COPY: Record<Etapa, { icon: string; title: string; subtitle: (emailHint: string) => string }> = {
  documento: {
    icon: '🔑',
    title: 'Recuperar senha',
    subtitle: () => 'Informe o CNPJ da sua empresa para receber o código de recuperação por e-mail.',
  },
  codigo: {
    icon: '📩',
    title: 'Verificar código',
    subtitle: hint => `Digite o código de 6 dígitos enviado para ${hint || 'seu e-mail'}.`,
  },
  novaSenha: {
    icon: '🔒',
    title: 'Nova senha',
    subtitle: () => 'Crie uma nova senha para sua conta.',
  },
};

export default function EsqueceuSenhaPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('documento');
  const [cnpj, setCnpj] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doc = cnpj.replace(/\D/g, '');

  async function enviarCodigo() {
    if (!doc) {
      setErro('Informe o CNPJ.');
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
    <div className="min-h-screen bg-matriz flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate('/empresa/login')}
          className="mb-6 text-sm font-semibold text-pulso"
        >
          ← Voltar
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <span className="text-4xl mb-4">{copy.icon}</span>
          <h1 className="text-2xl font-bold text-clareza mb-2">{copy.title}</h1>
          <p className="text-sm text-gray leading-relaxed">{copy.subtitle(emailHint)}</p>
        </div>

        <div className="rounded-xl bg-white p-7 shadow-2xl shadow-black/30">
          {etapa === 'documento' && (
            <>
              <label className="block text-xs font-semibold text-matriz mb-1.5">CNPJ</label>
              <input
                value={cnpj}
                onChange={e => setCnpj(maskCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                className="h-[50px] w-full rounded-lg border-[1.5px] border-grayBorder bg-grayLight px-4 text-[15px] text-matriz placeholder:text-gray outline-none focus:border-pulso"
              />
              {erro && <p className="mt-2 text-xs font-medium text-danger">{erro}</p>}
              <button
                onClick={enviarCodigo}
                disabled={loading}
                className="mt-6 flex h-[52px] w-full items-center justify-center rounded-lg bg-pulso font-bold text-matriz shadow-lg shadow-pulso/40 disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar código'}
              </button>
            </>
          )}

          {etapa === 'codigo' && (
            <>
              <label className="block text-xs font-semibold text-matriz mb-1.5">
                Código de verificação
              </label>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                className="h-[50px] w-full rounded-lg border-[1.5px] border-grayBorder bg-grayLight px-4 text-center text-2xl font-bold tracking-[8px] text-matriz placeholder:text-gray outline-none focus:border-pulso"
              />
              {erro && <p className="mt-2 text-xs font-medium text-danger">{erro}</p>}
              <button
                onClick={verificarCodigo}
                disabled={loading}
                className="mt-6 flex h-[52px] w-full items-center justify-center rounded-lg bg-pulso font-bold text-matriz shadow-lg shadow-pulso/40 disabled:opacity-70"
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
              <label className="block text-xs font-semibold text-matriz mb-1.5">Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="••••••••"
                className="h-[50px] w-full rounded-lg border-[1.5px] border-grayBorder bg-grayLight px-4 text-[15px] text-matriz placeholder:text-gray outline-none focus:border-pulso"
              />
              <label className="block text-xs font-semibold text-matriz mb-1.5 mt-4">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="••••••••"
                className="h-[50px] w-full rounded-lg border-[1.5px] border-grayBorder bg-grayLight px-4 text-[15px] text-matriz placeholder:text-gray outline-none focus:border-pulso"
              />
              {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="mt-1.5 text-xs text-danger">As senhas não coincidem</p>
              )}
              {erro && <p className="mt-2 text-xs font-medium text-danger">{erro}</p>}
              <button
                onClick={handleRedefinir}
                disabled={loading}
                className="mt-6 flex h-[52px] w-full items-center justify-center rounded-lg bg-pulso font-bold text-matriz shadow-lg shadow-pulso/40 disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Redefinir senha'}
              </button>
            </>
          )}
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-2 rounded-full bg-border',
                i === stepIndex ? 'w-6 bg-pulso' : i < stepIndex ? 'w-2 bg-pulso' : 'w-2',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
