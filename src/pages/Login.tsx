import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { toast } from "sonner";
import { loginSchema } from "@/lib/validation/schemas";
import { rateLimitService } from "@/lib/auth/rateLimit.service";
import { sanitizeString, sanitizePhone } from "@/lib/sanitize";
import { apiClient } from "@/lib/api/apiClient";

function Field({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div className="text-[10px] text-navy-light tracking-[1.6px] uppercase font-mono mb-1.5">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regProfileEmail, setRegProfileEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});

  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate(user.role === "admin" ? "/projects" : "/offers", {
      replace: true,
    });
    return null;
  }

  async function doSignIn() {
    const parsed = loginSchema.safeParse({
      emailOrPhone: email,
      password: pass,
    });
    if (!parsed.success) {
      const field: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        field[e.path[0] as string] = e.message;
      });
      setFieldErrors(field);
      setErr("Please fill in all fields");
      return;
    }
    setFieldErrors({});

    const rl = rateLimitService.check(email.trim().toLowerCase());
    if (!rl.allowed) {
      const remaining = Math.ceil((rl.lockedUntil! - Date.now()) / 1000);
      setErr(`Too many attempts. Try again in ${remaining}s.`);
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const u = await signIn(sanitizeString(email), pass);
      rateLimitService.reset(email.trim().toLowerCase());
      toast.success(`Welcome back, ${u.name}`);
      navigate(u.role === "admin" ? "/projects" : "/offers", { replace: true });
    } catch (ex: any) {
      rateLimitService.recordAttempt(email.trim().toLowerCase());
      const message = ex.message || "Invalid credentials";
      setErr(message);
      toast.error(message);

      const lower = message.toLowerCase();
      if (lower.includes("password") || lower.includes("pass")) {
        setFieldErrors({ password: message });
      } else if (lower.includes("email") || lower.includes("phone")) {
        setFieldErrors({ emailOrPhone: message });
      }
    } finally {
      setLoading(false);
    }
  }

  async function doRegister() {
    if (!name || !email || !pass) {
      setErr("Please fill all fields");
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>("auth/register", {
        name: sanitizeString(name),
        email: sanitizeString(email),
        password: pass,
        phone: sanitizePhone(regPhone) || undefined,
        profileEmail: sanitizeString(regProfileEmail) || sanitizeString(email),
      });

      const message = response.data.message || "Registration successful. Await admin approval";
      toast.success(message);
      setErr(message);

      // Clear fields
      setName("");
      setEmail("");
      setPass("");
      setRegPhone("");
      setRegProfileEmail("");

      // Switch to signin mode after a short delay
      setTimeout(() => {
        setMode("signin");
        setErr("");
      }, 3000);
    } catch (ex: any) {
      const errData = ex.response?.data || ex;
      const message = errData.message || "Registration failed";
      setErr(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const inpStyle =
    "w-full bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none focus:border-blue transition-colors disabled:opacity-60";

  return (
    <div className="w-[520px] my-5 bg-white border border-border rounded-[10px] shadow-[0_2px_8px_rgba(30,60,120,0.06)] p-[48px_40px]">
      <div className="text-center mb-8">
        <div className="w-[60px] h-[60px] rounded-xl bg-gold-dim border border-border flex items-center justify-center text-[28px] mx-auto mb-4">
          <span className="text-gold font-bold">R</span>
        </div>
        <div className="font-serif text-[28px] font-semibold text-navy">
          Reportage
        </div>
        <div className="text-[11px] text-navy-dim tracking-[2px] uppercase mt-1">
          SALES PLATFORM
        </div>
      </div>

      <div className="flex bg-surface rounded-lg p-1 mb-6">
        {(
          [
            ["signin", "Sign In"],
            ["register", "Create Account"],
          ] as const
        ).map((m) => (
          <div
            key={m[0]}
            onClick={() => {
              if (loading) return;
              setMode(m[0]);
              setErr("");
              setFieldErrors({});
            }}
            className={`flex-1 text-center py-2.5 px-2.5 rounded-md cursor-pointer text-sm
              ${
                mode === m[0]
                  ? "bg-white text-gold font-semibold border-b-2 border-gold"
                  : "bg-transparent text-navy-light border-b-2 border-transparent"
              }`}
          >
            {m[1]}
          </div>
        ))}
      </div>

      {mode === "register" && (
        <Field label="Full Name">
          <input
            className={inpStyle}
            value={name}
            disabled={loading}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </Field>
      )}

      <Field label={mode === "signin" ? "Email or Phone" : "Email"}>
        <input
          className={`${inpStyle} ${fieldErrors.emailOrPhone ? "border-red" : ""}`}
          type={mode === "signin" ? "text" : "email"}
          value={email}
          disabled={loading}
          onChange={(e) => {
            setEmail(e.target.value);
            setErr("");
            setFieldErrors({});
          }}
          placeholder={
            mode === "signin" ? "Email or phone number" : "you@reportage.ae"
          }
        />
        {fieldErrors.emailOrPhone && (
          <div className="text-[11px] text-red mt-1">
            {fieldErrors.emailOrPhone}
          </div>
        )}
      </Field>

      <Field label="Password">
        <input
          className={`${inpStyle} ${fieldErrors.password ? "border-red" : ""}`}
          type="password"
          value={pass}
          disabled={loading}
          onChange={(e) => {
            setPass(e.target.value);
            setErr("");
            setFieldErrors({});
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && mode === "signin") doSignIn();
          }}
        />
        {fieldErrors.password && (
          <div className="text-[11px] text-red mt-1">
            {fieldErrors.password}
          </div>
        )}
      </Field>

      {mode === "signin" && (
        <div className="flex justify-end mb-4">
          <span
            onClick={() => navigate("/forgot-password")}
            className="text-xs text-blue hover:underline cursor-pointer font-semibold"
          >
            Forgot Password?
          </span>
        </div>
      )}

      {mode === "register" && (
        <div>
          <Field label="Phone / WhatsApp">
            <input
              className={inpStyle}
              value={regPhone}
              disabled={loading}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="971501234567"
            />
          </Field>
          <Field label="Display Email (shown on offers)">
            <input
              className={inpStyle}
              type="email"
              value={regProfileEmail}
              disabled={loading}
              onChange={(e) => setRegProfileEmail(e.target.value)}
              placeholder="Same as login or different"
            />
            <div className="text-[10px] text-navy-dim mt-1">
              This email appears on your sales offers
            </div>
          </Field>
        </div>
      )}

      {err && Object.keys(fieldErrors).length === 0 && (
        <div
          className={`text-xs rounded-md px-3 py-2 mb-3 ${
            err.includes("created") || err.includes("successful")
              ? "bg-green-dim text-green"
              : "bg-red-dim text-red"
          }`}
        >
          {err}
        </div>
      )}

      <button
        onClick={mode === "signin" ? doSignIn : doRegister}
        disabled={loading}
        className="w-full py-[13px] text-[13px] font-bold border-none rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg,#C9A84C,#E4C97A)",
          color: "#1A2340",
        }}
      >
        {loading
          ? "Signing in..."
          : mode === "signin"
            ? "Sign In"
            : "Create Account"}
      </button>
    </div>
  );
}
