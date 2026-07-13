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

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken;

  useEffect(() => {
    if (!resetToken) {
      toast.error("Invalid session. Please request a new verification code.");
      navigate("/forgot-password", { replace: true });
    }
  }, [resetToken, navigate]);

  const inpStyle =
    "w-full bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none focus:border-blue transition-colors disabled:opacity-60";

  async function handleResetPasswordSubmit() {
    if (!newPassword || newPassword.length < 6) {
      setFieldErrors({ newPassword: "Password must be at least 6 characters" });
      setErr("Password too short");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      setErr("Passwords do not match");
      return;
    }

    setLoading(true);
    setErr("");
    setFieldErrors({});
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>("auth/reset-password", {
        resetToken,
        newPassword,
      });

      toast.success(response.data.message || "Password reset successfully!");
      
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (ex: any) {
      const errData = ex.response?.data || ex;
      const message = errData.message || "Failed to reset password";
      setErr(message);
      toast.error(message);
      setFieldErrors({ newPassword: message });
    } finally {
      setLoading(false);
    }
  }

  if (!resetToken) return null;

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
          Reset Password
        </div>
        <div className="text-[12px] text-navy-dim mb-5 text-center">
          Choose a strong new password to secure your account.
        </div>

        <Field label="New Password">
          <input
            className={`${inpStyle} ${fieldErrors.newPassword ? "border-red" : ""}`}
            type="password"
            value={newPassword}
            disabled={loading}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setErr("");
              setFieldErrors({});
            }}
            placeholder="Enter new password"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleResetPasswordSubmit();
            }}
          />
          {fieldErrors.newPassword && (
            <div className="text-[11px] text-red mt-1">
              {fieldErrors.newPassword}
            </div>
          )}
        </Field>

        <Field label="Confirm Password">
          <input
            className={`${inpStyle} ${fieldErrors.confirmPassword ? "border-red" : ""}`}
            type="password"
            value={confirmPassword}
            disabled={loading}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErr("");
              setFieldErrors({});
            }}
            placeholder="Confirm new password"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleResetPasswordSubmit();
            }}
          />
          {fieldErrors.confirmPassword && (
            <div className="text-[11px] text-red mt-1">
              {fieldErrors.confirmPassword}
            </div>
          )}
        </Field>

        {err && Object.keys(fieldErrors).length === 0 && (
          <div className="text-xs rounded-md px-3 py-2 mb-3 bg-red-dim text-red">
            {err}
          </div>
        )}

        <button
          onClick={handleResetPasswordSubmit}
          disabled={loading}
          className="w-full py-[13px] text-[13px] font-bold border-none rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          style={{
            background: "linear-gradient(135deg,#C9A84C,#E4C97A)",
            color: "#1A2340",
          }}
        >
          {loading ? "Resetting..." : "Continue"}
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
