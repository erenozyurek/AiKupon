import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'En az 8 karakter' },
  { test: (p) => /[A-Z]/.test(p), label: 'Bir büyük harf' },
  { test: (p) => /[0-9]/.test(p), label: 'Bir rakam' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'Bir özel karakter' },
];

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: 'Zayıf', color: 'bg-error' };
  if (passed === 2) return { score: 2, label: 'Orta', color: 'bg-warning' };
  if (passed === 3) return { score: 3, label: 'İyi', color: 'bg-accent' };
  return { score: 4, label: 'Güçlü', color: 'bg-success' };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(form.password);

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) {
      errs.username = 'Kullanıcı adı zorunludur';
    } else if (form.username.trim().length < 3) {
      errs.username = 'Kullanıcı adı en az 3 karakter olmalıdır';
    }
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
    if (!form.passwordConfirm) {
      errs.passwordConfirm = 'Şifre tekrarı zorunludur';
    } else if (form.password !== form.passwordConfirm) {
      errs.passwordConfirm = 'Şifreler eşleşmiyor';
    }
    if (!acceptTerms) {
      errs.terms = 'Kullanım koşullarını kabul etmelisiniz';
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
      const { data } = await api.post('/auth/register', {
        email: form.email,
        username: form.username,
        password: form.password,
      });
      // Başarılı kayıt → otomatik login
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-bg-base via-primary-dark to-bg-base">
      {/* Dekoratif arka plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-light/10 rounded-full blur-3xl" />
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
            Yeni hesap oluşturun
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
            {/* Kullanıcı Adı */}
            <div className="mb-4">
              <label htmlFor="username" className="block text-xs font-medium text-text-secondary mb-1.5">
                Kullanıcı Adı
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full bg-bg-base border rounded-lg text-sm text-text-primary placeholder-text-muted px-3 py-2.5 focus:outline-none transition-colors ${
                  errors.username ? 'border-error focus:border-error' : 'border-border focus:border-accent'
                }`}
                placeholder="kullanici_adi"
              />
              {errors.username && (
                <p className="mt-1 text-[11px] text-error">{errors.username}</p>
              )}
            </div>

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
                  errors.email ? 'border-error focus:border-error' : 'border-border focus:border-accent'
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
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-[11px] text-error">{errors.password}</p>
              )}

              {/* Şifre güç göstergesi */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength.score ? strength.color : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] ${
                      strength.score <= 1 ? 'text-error' :
                      strength.score === 2 ? 'text-warning' :
                      strength.score === 3 ? 'text-accent' : 'text-success'
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {PASSWORD_RULES.map((rule) => (
                      <span
                        key={rule.label}
                        className={`text-[10px] flex items-center gap-1 ${
                          rule.test(form.password) ? 'text-success' : 'text-text-muted'
                        }`}
                      >
                        {rule.test(form.password) ? '✓' : '○'} {rule.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Şifre Tekrar */}
            <div className="mb-4">
              <label htmlFor="passwordConfirm" className="block text-xs font-medium text-text-secondary mb-1.5">
                Şifre Tekrar
              </label>
              <PasswordInput
                id="passwordConfirm"
                name="passwordConfirm"
                autoComplete="new-password"
                value={form.passwordConfirm}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.passwordConfirm}
                placeholder="••••••••"
              />
              {errors.passwordConfirm && (
                <p className="mt-1 text-[11px] text-error">{errors.passwordConfirm}</p>
              )}
            </div>

            {/* Kullanım koşulları */}
            <div className="mb-6">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
                  }}
                  className="w-3.5 h-3.5 mt-0.5 rounded border-border bg-bg-base text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-xs text-text-secondary">
                  <Link to="/terms" className="text-accent hover:text-accent-light transition-colors">
                    Kullanım Koşulları
                  </Link>
                  'nı ve{' '}
                  <Link to="/privacy" className="text-accent hover:text-accent-light transition-colors">
                    Gizlilik Politikası
                  </Link>
                  'nı okudum ve kabul ediyorum.
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1 ml-5 text-[11px] text-error">{errors.terms}</p>
              )}
            </div>

            {/* Kayıt butonu */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner />
                  Hesap oluşturuluyor...
                </>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </form>
        </div>

        {/* Giriş linki */}
        <p className="text-center text-sm text-text-secondary mt-6">
          Zaten hesabın var mı?{' '}
          <Link to="/login" className="text-accent hover:text-accent-light font-medium transition-colors">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}

function PasswordInput({ id, name, autoComplete, value, onChange, onBlur, error, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
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
