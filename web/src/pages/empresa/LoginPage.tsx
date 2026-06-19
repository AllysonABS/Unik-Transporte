import { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { maskCnpj } from '@/lib/mask';
import { cn } from '@/lib/utils';
import LogoMark from '@/components/empresa/LogoMark';

const LEMBRAR_KEY = 'narota_lembrar_doc';

export default function LoginPage() {
  const { token, login } = useEmpresaAuth();
  const navigate = useNavigate();
  const [cnpj, setCnpj] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LEMBRAR_KEY);
    if (saved) {
      setCnpj(saved);
      setLembrar(true);
    }
  }, []);

  if (token) {
    return <Navigate to="/empresa/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cnpj || !senha) {
      setServerError('Preencha CNPJ e senha.');
      return;
    }
    setServerError(null);
    setLoading(true);

    if (lembrar) {
      localStorage.setItem(LEMBRAR_KEY, cnpj);
    } else {
      localStorage.removeItem(LEMBRAR_KEY);
    }

    const result = await login(cnpj.replace(/\D/g, ''), senha);
    setLoading(false);
    if (result.success) {
      navigate('/empresa/dashboard', { replace: true });
    } else {
      setServerError(result.error || 'Erro ao entrar.');
    }
  }

  return (
    <div className="min-h-screen bg-matriz flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2.5 pt-4">
          <LogoMark />
          <h1 className="text-[28px] font-bold text-clareza tracking-tight">Na Rota</h1>
          <p className="text-xs font-medium uppercase tracking-[3px] text-pulso">Fácil Transporte</p>
        </div>

        <div className="rounded-xl bg-white p-7 shadow-2xl shadow-black/30">
          <h2 className="text-lg font-bold text-matriz mb-6">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="cnpj" className="block text-xs font-semibold text-matriz mb-1.5">
                CNPJ
              </label>
              <input
                id="cnpj"
                value={cnpj}
                onChange={e => setCnpj(maskCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                autoComplete="username"
                className="h-[50px] w-full rounded-lg border-[1.5px] border-grayBorder bg-grayLight px-4 text-[15px] text-matriz placeholder:text-gray outline-none focus:border-pulso"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="senha" className="block text-xs font-semibold text-matriz mb-1.5">
                Senha
              </label>
              <div className="flex h-[50px] items-center rounded-lg border-[1.5px] border-grayBorder bg-grayLight">
                <input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-full flex-1 bg-transparent px-4 text-[15px] text-matriz placeholder:text-gray outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3.5 text-gray"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-5 mt-1">
              <button
                type="button"
                onClick={() => setLembrar(!lembrar)}
                className="flex items-center gap-2"
                aria-pressed={lembrar}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border-[1.5px]',
                    lembrar ? 'bg-pulso border-pulso' : 'border-grayBorder',
                  )}
                >
                  {lembrar && <Check className="h-3.5 w-3.5 text-matriz" strokeWidth={3} />}
                </span>
                <span className="text-[13px] font-medium text-matriz">Lembrar-se</span>
              </button>
              <Link to="/empresa/esqueceu-senha" className="text-[13px] font-semibold text-pulso">
                Esqueceu a senha?
              </Link>
            </div>

            {serverError && <p className="mb-4 text-sm font-medium text-danger">{serverError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex h-[52px] w-full items-center justify-center rounded-lg bg-pulso font-bold text-matriz shadow-lg shadow-pulso/40 transition-opacity disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-1 pb-2">
          <span className="text-sm text-clareza">Não tem uma conta?</span>
          <Link to="/cadastro" className="text-sm font-bold text-pulso">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
