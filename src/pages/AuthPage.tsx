import { useEffect, useState, type FormEvent } from "react";
import { resendSignupOtp, signInWithUsername, signUpWithUsername, verifySignupOtp } from "../lib/iconStore";
import { navigate } from "../lib/router";
import { toMessage } from "../lib/storeApi";
import { useToast } from "../lib/toast";

function OtpInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return <div className="zuno-otp" onClick={() => document.getElementById("zuno-signup-otp")?.focus()}>
    <div className="zuno-otp-cells" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className={`zuno-otp-cell${value[index] ? " filled" : ""}`} key={index}><span className="otp-liquid" /><strong>{value[index] ?? ""}</strong>{!value[index] && <i />}</div>)}</div>
    <input id="zuno-signup-otp" className="zuno-otp-real-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} aria-label="6 haneli e-posta doğrulama kodu" />
  </div>;
}

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const isLogin = mode === "login";
  useEffect(() => { if (resendIn <= 0) return; const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000); return () => window.clearTimeout(timer); }, [resendIn]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!isLogin && password !== confirm) { setError("Şifreler eşleşmiyor."); return; }
    setBusy(true);
    try {
      if (isLogin) { await signInWithUsername(username, password); toast("Giriş yapıldı."); navigate("/profile"); }
      else {
        const data = await signUpWithUsername({ username, email, password });
        if (data.user?.identities?.length === 0) throw new Error("Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene.");
        if (data.session) { toast("Hesabın oluşturuldu."); navigate("/profile"); }
        else if (data.user) { setNeedsConfirm(email.trim()); setOtp(""); setResendIn(60); }
        else throw new Error("Hesap oluşturulamadı. Bilgilerini kontrol edip tekrar dene.");
      }
    } catch (reason) {
      const message = toMessage(reason);
      setError(message.includes("too many colons in address") ? "E-posta gönderim sunucusunun SMTP adresi hatalı yapılandırılmış. Supabase doğrulama e-postasını gönderemiyor; yönetici SMTP ayarlarını düzeltmeli." : message);
    }
    finally { setBusy(false); }
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!/^\d{6}$/.test(otp)) { setError("6 haneli doğrulama kodunu gir."); return; }
    setBusy(true);
    try {
      const result = await verifySignupOtp(needsConfirm, otp);
      if (!result.session || !result.user) throw new Error("E-posta doğrulandı ancak oturum açılamadı. Kullanıcı adı ve şifrenle giriş yap.");
      toast("E-posta doğrulandı. ZUNO'ya hoş geldin."); navigate("/profile");
    } catch (reason) { setError(toMessage(reason)); }
    finally { setBusy(false); }
  }

  async function onResend() {
    if (!needsConfirm || resendIn > 0) return;
    setBusy(true); setError("");
    try { await resendSignupOtp(needsConfirm); setResendIn(60); setOtp(""); toast("Yeni doğrulama kodu gönderildi."); }
    catch (reason) { setError(toMessage(reason)); }
    finally { setBusy(false); }
  }

  if (needsConfirm) return <section className="authbox glass"><h1>E-postanı doğrula</h1><p className="muted otp-instructions"><strong>{needsConfirm}</strong>E-posta adresine gönderilen 6 haneli kodu gir.</p>
    <form className="form" onSubmit={onVerify}><label>Doğrulama kodu<OtpInput value={otp} onChange={setOtp} /></label>{error && <p className="form__error" role="alert">{error}</p>}<button type="submit" className="btn btn--primary btn--wide" disabled={busy || otp.length !== 6}>{busy ? "Doğrulanıyor…" : "E-postayı doğrula"}</button></form>
    <div className="otp-actions"><button type="button" className="otp-resend" onClick={() => void onResend()} disabled={busy || resendIn > 0}>{resendIn > 0 ? `Yeni kodu ${resendIn} sn sonra iste` : "Yeni kod gönder"}</button><button type="button" className="otp-resend" onClick={() => { setNeedsConfirm(""); setOtp(""); setResendIn(0); setError(""); }}>E-posta adresini değiştir</button></div>
  </section>;

  return <section className="authbox glass"><h1>{isLogin ? "Tekrar hoş geldin" : "Hesap oluştur"}</h1><p className="muted">{isLogin ? "Kullanıcı adın ve şifrenle giriş yap." : "İkon yüklemek ve beğenmek için kayıt ol."}</p>
    <form className="form" onSubmit={onSubmit} noValidate><label>Kullanıcı adı<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={24} required placeholder="ornek_kullanici" /></label>
      {!isLogin && <label>E-posta<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" required placeholder="sen@ornek.com" /></label>}
      <label>Şifre<div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} required minLength={isLogin ? 1 : 8} placeholder={isLogin ? "••••••••" : "En az 8 karakter"} /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m4 4 16 16" />}</svg></button></div></label>
      {!isLogin && <label>Şifre (tekrar)<div className="password-field"><input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={8} /><button type="button" className="password-toggle" onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showConfirm}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showConfirm && <path d="m4 4 16 16" />}</svg></button></div></label>}
      {error && <p className="form__error" role="alert">{error}</p>}<button type="submit" className="btn btn--primary btn--wide" disabled={busy}>{busy ? "Lütfen bekle…" : isLogin ? "Giriş yap" : "Kayıt ol"}</button></form>
    <p className="muted switch">{isLogin ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}<a href={isLogin ? "#/register" : "#/login"}>{isLogin ? "Kayıt ol" : "Giriş yap"}</a></p>
  </section>;
}
