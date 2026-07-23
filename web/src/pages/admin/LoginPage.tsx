import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminLoginPage() {
  const { token, login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) {
      setServerError('Preencha e-mail e senha.');
      return;
    }
    setServerError(null);
    setLoading(true);
    const result = await login(email, senha);
    setLoading(false);
    if (result.success) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      setServerError(result.error || 'Erro ao entrar.');
    }
  }

  return (
    <div className="min-h-screen bg-matriz flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2.5 pt-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
            <ShieldCheck className="h-7 w-7 text-pulso" />
          </div>
          <h1 className="text-[28px] font-bold text-clareza tracking-tight">Na Rota Admin</h1>
          <p className="text-xs font-medium uppercase tracking-[3px] text-pulso">Gestão da plataforma</p>
        </div>

        <div className="rounded-xl bg-white p-7 shadow-2xl shadow-black/30">
          <h2 className="text-lg font-bold text-matriz mb-6">Entrar como administrador</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-xs font-semibold text-matriz mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
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
      </div>
    </div>
  );
}
