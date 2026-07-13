import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/app/providers/AuthProvider";
import { settingsService } from "@/services/settings.service";
import { Avatar } from "@/components/ui";

const getFileUrl = (path: string | null) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.indexOf("uploads/");
  if (idx !== -1) {
    const rel = normalized.substring(idx);
    let root = (
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/"
    ).replace(/\/api\/?$/, "");
    if (root.endsWith("/")) {
      root = root.slice(0, -1);
    }
    return `${root}/${rel}`;
  }
  return path;
};

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const settings = settingsService.get();

  const [name, setName] = useState(user?.name || "");
  const phone = user?.phone || "";
  const profileEmail = user?.profileEmail || user?.email || "";
  const [photo, setPhoto] = useState<string | null>(user?.photo || null);
  const [watermark, setWatermark] = useState<string | null>(
    user?.watermark || null,
  );
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wmRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const updated = await updateProfile({ photo: f });
      setPhoto(updated.photo);
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const updated = await updateProfile({ watermark: f });
      setWatermark(updated.watermark);
      toast.success("Watermark uploaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload watermark");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setUploading(true);
    try {
      await updateProfile({ name });
      setSaved(true);
      toast.success("Profile saved");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save profile");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="font-serif text-2xl text-navy mb-6 font-semibold">
        My Profile
      </h1>

      <div className="bg-white border border-border rounded-[10px] p-6 shadow-[0_2px_8px_rgba(30,60,120,0.06)]">
        <div className="flex gap-5 items-start mb-5">
          <div className="text-center">
            <Avatar
              photo={getFileUrl(photo)}
              name={name}
              size={80}
              className="!w-20 !h-20"
            />
            <button
              className="bg-transparent text-navy-light border border-border rounded-[6px] text-[11px] mt-2 px-3 py-1.5 block w-full cursor-pointer hover:bg-gold-dim transition-colors"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Change Photo"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <div className="block text-[10px] font-mono text-navy-light tracking-[1.6px] uppercase mb-1.5">
                Full Name
              </div>
              <input
                className="w-full bg-[#F8FAFF] border border-border rounded-[6px] text-navy px-3.5 py-2.5 text-[13px] outline-none focus:border-blue transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="block text-[10px] font-mono text-navy-light tracking-[1.6px] uppercase mb-1.5">
                  Phone / WhatsApp
                </div>
                <input
                  disabled
                  className="w-full bg-[#F1F5F9] border border-border rounded-[6px] text-navy-dim px-3.5 py-2.5 text-[13px] outline-none cursor-not-allowed transition-colors"
                  value={phone}
                  placeholder="971501234567"
                />
              </div>
              <div className="flex-1">
                <div className="block text-[10px] font-mono text-navy-light tracking-[1.6px] uppercase mb-1.5">
                  Email (for offer footer)
                </div>
                 <input
                   disabled
                   className="w-full bg-[#F1F5F9] border border-border rounded-[6px] text-navy-dim px-3.5 py-2.5 text-[13px] outline-none cursor-not-allowed transition-colors"
                   value={profileEmail}
                 />
              </div>
            </div>
            <div className="text-[11px] text-navy-dim">
              Login email: {user.email} &middot; Role: {user.role}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[10px] p-6 mb-4">
          <div className="block text-[10px] font-mono text-navy-light tracking-[1.6px] uppercase mb-1.5">
            Watermark
          </div>
          <div className="text-[12px] text-navy-dim mb-3">
            Default: &ldquo;{settings.teamName}&rdquo; text watermark. Upload an
            image to use instead.
          </div>
          <div className="flex gap-3 items-center">
            {watermark ? (
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-green-dim border border-[rgba(26,138,90,0.2)] rounded-lg">
                <img
                  src={getFileUrl(watermark)}
                  alt="Watermark"
                  className="h-10 opacity-70 rounded"
                />
                <button
                  className="bg-transparent text-red border border-red border-opacity-25 rounded-md px-2.5 py-1 text-[11px] cursor-pointer"
                  onClick={async () => {
                    setUploading(true);
                    try {
                      await updateProfile({ watermark: null });
                      setWatermark(null);
                      toast.success("Watermark removed");
                    } catch (err: any) {
                      toast.error(
                        err?.response?.data?.message || "Failed to remove watermark"
                      );
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="px-3.5 py-2 bg-gold-dim border border-[rgba(184,134,11,0.2)] rounded-[6px] text-[12px] text-gold">
                  Using default: {settings.teamName}
                </div>
                <label className="bg-transparent text-navy-light border border-border rounded-[6px] text-[12px] px-3.5 py-2 cursor-pointer hover:bg-gold-dim transition-colors">
                  {uploading ? "Uploading..." : "Upload Custom Watermark"}
                  <input
                    ref={wmRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleWatermarkUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 items-center">
          <button
            className="bg-linear-to-br from-[#C9A84C] to-[#E4C97A] text-navy border-none rounded-[6px] px-6 py-2.5 text-[13px] font-bold cursor-pointer"
            onClick={save}
            disabled={uploading}
          >
            {uploading ? "Saving..." : "Save Profile"}
          </button>
          {saved && (
            <span className="text-[12px] text-green">Profile saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}
