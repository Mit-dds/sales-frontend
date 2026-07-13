import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/apiClient";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold text-navy-dim tracking-[1px] uppercase mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const navigate = useNavigate();

  const inpStyle =
    "w-full bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none focus:border-blue transition-colors disabled:opacity-60";

  async function handleForgotPasswordSubmit() {
    if (!email) {
      setFieldErrors({ email: "Email is required" });
      setErr("Please enter your email");
      return;
    }
    const isEmail = email.includes("@");
    if (!isEmail) {
      setFieldErrors({ email: "Please enter a valid email address" });
      setErr("Invalid email format");
      return;
    }

    setLoading(true);
    setErr("");
    setFieldErrors({});
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>("auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      toast.success(response.data.message || "OTP sent successfully.");
      navigate("/verify-otp", { state: { email: email.trim().toLowerCase() } });
    } catch (ex: any) {
      const errData = ex.response?.data || ex;
      const message = errData.message || "Failed to send OTP";
      setErr(message);
      toast.error(message);
      setFieldErrors({ email: message });
    } finally {
      setLoading(false);
    }
  }

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

      <div>
        <div className="font-serif text-[22px] font-semibold text-navy mb-2 text-center">
          Forgot Password
        </div>
        <div className="text-[12px] text-navy-dim mb-5 text-center">
          Enter your registered email address to request a 6-digit OTP code.
        </div>

        <Field label="Email Address">
          <input
            className={`${inpStyle} ${fieldErrors.email ? "border-red" : ""}`}
            type="email"
            value={email}
            disabled={loading}
            onChange={(e) => {
              setEmail(e.target.value);
              setErr("");
              setFieldErrors({});
            }}
            placeholder="you@reportage.ae"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleForgotPasswordSubmit();
            }}
          />
          {fieldErrors.email && (
            <div className="text-[11px] text-red mt-1">
              {fieldErrors.email}
            </div>
          )}
        </Field>

        {err && Object.keys(fieldErrors).length === 0 && (
          <div className="text-xs rounded-md px-3 py-2 mb-3 bg-red-dim text-red">
            {err}
          </div>
        )}

        <button
          onClick={handleForgotPasswordSubmit}
          disabled={loading}
          className="w-full py-[13px] text-[13px] font-bold border-none rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          style={{
            background: "linear-gradient(135deg,#C9A84C,#E4C97A)",
            color: "#1A2340",
          }}
        >
          {loading ? "Processing..." : "Continue"}
        </button>

        <div className="text-center">
          <span
            onClick={() => navigate("/login")}
            className="text-xs text-blue hover:underline cursor-pointer font-semibold"
          >
            Back to Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
