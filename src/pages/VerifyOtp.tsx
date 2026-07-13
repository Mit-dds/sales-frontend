import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      toast.error("Please request a password reset code first.");
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  const inpStyle =
    "w-full bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none focus:border-blue transition-colors disabled:opacity-60";

  async function handleOtpVerify() {
    if (!otp || otp.length !== 6) {
      setFieldErrors({ otp: "Please enter a valid 6-digit OTP" });
      setErr("Invalid OTP");
      return;
    }

    setLoading(true);
    setErr("");
    setFieldErrors({});
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: {
          resetToken: string;
        };
      }>("auth/verify-otp", {
        email,
        otp: otp.trim(),
      });

      const resetToken = response.data.data.resetToken;
      toast.success(response.data.message || "OTP verified successfully!");
      navigate("/reset-password", { state: { resetToken } });
    } catch (ex: any) {
      const errData = ex.response?.data || ex;
      const message = errData.message || "Verification failed";
      setErr(message);
      toast.error(message);
      setFieldErrors({ otp: message });
    } finally {
      setLoading(false);
    }
  }

  if (!email) return null;

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
          Verification Required
        </div>
        <div className="text-[12px] text-navy-dim mb-5 text-center">
          We have sent a verification code to {email}. Please enter the OTP to continue.
        </div>

        <Field label="6-Digit OTP Code">
          <input
            className={`${inpStyle} ${fieldErrors.otp ? "border-red" : ""}`}
            type="text"
            value={otp}
            disabled={loading}
            maxLength={6}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ""));
              setErr("");
              setFieldErrors({});
            }}
            placeholder="000000"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleOtpVerify();
            }}
          />
          {fieldErrors.otp && (
            <div className="text-[11px] text-red mt-1">
              {fieldErrors.otp}
            </div>
          )}
        </Field>

        {err && Object.keys(fieldErrors).length === 0 && (
          <div className="text-xs rounded-md px-3 py-2 mb-3 bg-red-dim text-red">
            {err}
          </div>
        )}

        <button
          onClick={handleOtpVerify}
          disabled={loading}
          className="w-full py-[13px] text-[13px] font-bold border-none rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          style={{
            background: "linear-gradient(135deg,#C9A84C,#E4C97A)",
            color: "#1A2340",
          }}
        >
          {loading ? "Verifying..." : "Continue"}
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
