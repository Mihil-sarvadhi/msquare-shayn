import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { login, clearError } from '@store/slices/authSlice';

export function AuthPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    }
  }

  return (
    <div className="fixed inset-0 bg-[#FDFAF4] flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.12; }
          50%       { transform: scale(1.06); opacity: 0.06; }
        }
        @keyframes pulse-ring-2 {
          0%, 100% { transform: scale(1); opacity: 0.08; }
          50%       { transform: scale(1.04); opacity: 0.04; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logo-in {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .cr-1 { animation: pulse-ring   5s ease-in-out infinite; }
        .cr-2 { animation: pulse-ring   5s ease-in-out infinite 1s; }
        .cr-3 { animation: pulse-ring-2 7s ease-in-out infinite 0.5s; }
        .cr-4 { animation: pulse-ring-2 7s ease-in-out infinite 2s; }
        .card-animate { animation: card-in 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .logo-animate { animation: logo-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .shimmer-text {
          background: linear-gradient(90deg, #B8860B 0%, #F0C040 40%, #B8860B 60%, #D4A017 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Concentric rings */}
      <div className="cr-1 absolute w-[520px] h-[520px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(26,18,8,0.08)' }} />
      <div className="cr-2 absolute w-[700px] h-[700px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(26,18,8,0.06)' }} />
      <div className="cr-3 absolute w-[900px] h-[900px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(26,18,8,0.04)' }} />
      <div className="cr-4 absolute w-[1100px] h-[1100px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(26,18,8,0.025)' }} />

      {/* Card */}
      <div className="card-animate relative z-10 w-full max-w-sm mx-4 bg-white rounded-3xl shadow-xl shadow-[#B8860B]/8 border border-[#F0EBE0] px-8 py-10">

        {/* Logo */}
        <div className="logo-animate flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-2xl bg-[#B8860B]/20 blur-md scale-110" />
            <img src="/favicon.svg" alt="SHAYN" className="relative h-16 w-16 rounded-2xl" />
          </div>
          <p className="shimmer-text font-bold text-xl tracking-[0.3em] uppercase">SHAYN</p>
          <p className="text-[#8C7B64] text-[10px] tracking-[0.3em] uppercase mt-1">Management Information System</p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-7">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#E8DFD0]" />
          <div className="w-1 h-1 rounded-full bg-[#B8860B]/40" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#E8DFD0]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-[10px] font-semibold text-[#8C7B64] mb-1.5 tracking-widest uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B8860B]" strokeWidth={1.5} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shayn.in"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DFD0] bg-[#FDFAF4] text-[#1A1208] text-sm placeholder:text-[#C4B49A] focus:outline-none focus:border-[#B8860B] focus:bg-white focus:ring-2 focus:ring-[#B8860B]/10 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-semibold text-[#8C7B64] mb-1.5 tracking-widest uppercase">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B8860B]" strokeWidth={1.5} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-[#E8DFD0] bg-[#FDFAF4] text-[#1A1208] text-sm placeholder:text-[#C4B49A] focus:outline-none focus:border-[#B8860B] focus:bg-white focus:ring-2 focus:ring-[#B8860B]/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7B64] hover:text-[#B8860B] transition-colors"
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  : <Eye className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-3 rounded-xl bg-[#1A1208] text-[#D4A017] text-sm font-bold tracking-widest uppercase hover:bg-[#2C1E0A] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-[#D4A017]/30 border-t-[#D4A017] animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-[#C4B49A] text-[10px] tracking-widest uppercase mt-6">
          © {new Date().getFullYear()} SHAYN
        </p>
      </div>
    </div>
  );
}
