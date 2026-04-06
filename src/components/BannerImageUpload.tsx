import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import Cropper from "react-easy-crop";

interface Props {
  bucket: "gym-images" | "event-images";
  entityId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5242880;

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}

export function BannerImageUpload({ bucket, entityId, currentUrl, onUploaded, onRemoved }: Props) {
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const ref = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFile = (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP images are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const path = `${entityId}-banner-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) {
        toast.error("Upload failed — please try again");
        setUploading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(publicUrl);
      toast.success("Banner image updated");
      setCropSrc(null);
    } catch {
      toast.error("Crop failed — please try again");
    }
    setUploading(false);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
    if (ref.current) ref.current.value = "";
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
              cursor: uploading ? "wait" : "pointer",
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

      {/* Crop modal */}
      {cropSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCropCancel(); }}
        >
          <div
            style={{
              width: "min(90vw, 720px)",
              background: "#111318",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ padding: "16px 20px" }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#e8eaf0" }}>
                Crop Banner Image
              </h3>
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#080a0d" }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div className="flex items-center gap-3 mb-4">
                <ZoomOut style={{ width: 16, height: 16, color: "#8b909e" }} />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: "#e8a020" }}
                />
                <ZoomIn style={{ width: 16, height: 16, color: "#8b909e" }} />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCropCancel}
                  style={{
                    padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "transparent", color: "#8b909e", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropConfirm}
                  disabled={uploading}
                  style={{
                    padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "#e8a020", color: "#0d0f12", cursor: uploading ? "wait" : "pointer",
                    boxShadow: "0 0 12px rgba(232,160,32,0.25)",
                  }}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                  Crop & Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
