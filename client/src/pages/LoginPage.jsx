import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = 'Email adresi zorunludur';
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      errs.email = 'Geçerli bir email adresi giriniz';
    }
    if (!form.password) {
      errs.password = 'Şifre zorunludur';
    } else if (form.password.length < 8) {
      errs.password = 'Şifre en az 8 karakter olmalıdır';
    }
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const v = validate();
    if (v[name]) setErrors((prev) => ({ ...prev, [name]: v[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-bg-base via-primary-dark to-bg-base">
      {/* Dekoratif arka plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-light/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">Ai</span>
            </div>
            <span className="text-2xl font-bold text-text-primary">
              Ai<span className="text-accent">Kupon</span>
            </span>
          </Link>
          <p className="text-sm text-text-secondary mt-2">
            Hesabınıza giriş yapın
          </p>
        </div>

        {/* Kart */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/20">
          {/* API Hatası */}
          {apiError && (
            <div className="mb-4 px-3 py-2.5 bg-error/10 border border-error/30 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-error">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-1.5">
                Email Adresi
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full bg-bg-base border rounded-lg text-sm text-text-primary placeholder-text-muted px-3 py-2.5 focus:outline-none transition-colors ${
                  errors.email
                    ? 'border-error focus:border-error'
                    : 'border-border focus:border-accent'
                }`}
                placeholder="ornek@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-error">{errors.email}</p>
              )}
            </div>

            {/* Şifre */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Şifre
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-[11px] text-error">{errors.password}</p>
              )}
            </div>

            {/* Beni hatırla + Şifremi unuttum */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border bg-bg-base text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-xs text-text-secondary">Beni Hatırla</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-accent hover:text-accent-light transition-colors"
              >
                Şifremi Unuttum
              </Link>
            </div>

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          {/* Ayırıcı */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-text-muted uppercase tracking-wider">veya</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google ile giriş */}
          <button
            type="button"
            className="w-full py-2.5 bg-bg-base border border-border hover:border-border-light text-text-secondary hover:text-text-primary text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google ile Giriş Yap
          </button>
        </div>

        {/* Kayıt linki */}
        <p className="text-center text-sm text-text-secondary mt-6">
          Hesabın yok mu?{' '}
          <Link to="/register" className="text-accent hover:text-accent-light font-medium transition-colors">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}

function PasswordInput({ id, name, value, onChange, onBlur, error, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full bg-bg-base border rounded-lg text-sm text-text-primary placeholder-text-muted px-3 py-2.5 pr-10 focus:outline-none transition-colors ${
          error ? 'border-error focus:border-error' : 'border-border focus:border-accent'
        }`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
        tabIndex={-1}
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
