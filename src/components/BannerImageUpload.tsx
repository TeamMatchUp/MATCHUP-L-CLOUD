import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

interface Props {
  bucket: "gym-images" | "event-images";
  entityId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5242880;

export function BannerImageUpload({ bucket, entityId, currentUrl, onUploaded, onRemoved }: Props) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP images are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${entityId}-banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed — please try again");
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    onUploaded(publicUrl);
    toast.success("Banner image updated");
    setUploading(false);
  };

  return (
    <div>
      {currentUrl ? (
        <div className="relative" style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "16/9" }}>
          <img src={currentUrl} alt="Banner" className="w-full h-full object-cover" />
          {onRemoved && (
            <button
              onClick={() => onRemoved()}
              className="absolute top-2 right-2"
              style={{
                width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <X style={{ width: 14, height: 14, color: "#e8eaf0" }} />
            </button>
          )}
          <button
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="absolute bottom-2 right-2"
            style={{
              padding: "6px 14px", borderRadius: 8, background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)", color: "#e8a020", fontSize: 12, fontWeight: 600,
              cursor: uploading ? "wait" : "pointer", border: "1px solid rgba(232,160,32,0.3)",
            }}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          disabled={uploading}
          style={{
            width: "100%", aspectRatio: "16/9", borderRadius: 8, cursor: uploading ? "wait" : "pointer",
            border: "2px dashed rgba(232,160,32,0.3)", background: "rgba(232,160,32,0.04)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 8, color: "#8b909e", fontSize: 13,
          }}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#e8a020" }} />
          ) : (
            <>
              <Upload style={{ width: 24, height: 24, color: "#e8a020" }} />
              <span>Upload banner image</span>
              <span style={{ fontSize: 11 }}>JPEG, PNG, or WebP · Max 5MB</span>
            </>
          )}
        </button>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}
