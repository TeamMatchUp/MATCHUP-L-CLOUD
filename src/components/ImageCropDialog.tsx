import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspect: number;
  onCropComplete: (blob: Blob) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<Blob> {
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
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/jpeg", 0.92);
  });
}

export function ImageCropDialog({ open, onOpenChange, imageSrc, aspect, onCropComplete }: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestNewPhoto, setRequestNewPhoto] = useState(false);

  const onCropChange = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(blob);
      onOpenChange(false);
    } catch (err) {
      console.error("Crop failed", err);
    } finally {
      setSaving(false);
    }
  };

  const handleChooseDifferent = () => {
    setRequestNewPhoto(true);
    onOpenChange(false);
  };

  // Trigger file picker when requestNewPhoto flag is set and dialog closes
  if (requestNewPhoto) {
    setRequestNewPhoto(false);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="file"][accept="image/*"]');
      if (input) input.click();
    }, 100);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="p-4 pb-0 shrink-0">
          <DialogTitle className="font-heading">Crop Image</DialogTitle>
        </DialogHeader>
        <div className="relative w-full flex-1" style={{ height: 340, minHeight: 240 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropChange}
          />
        </div>
        <DialogFooter className="p-4 pt-3 shrink-0 flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={handleChooseDifferent}>Choose Different Photo</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Cropping..." : "Crop & Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}