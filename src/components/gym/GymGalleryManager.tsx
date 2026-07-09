import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, ArrowUp, ArrowDown, Loader2 } from "lucide-react";

interface GymGalleryManagerProps {
  gymId: string;
}

interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  sort_order: number;
}

export function GymGalleryManager({ gymId }: GymGalleryManagerProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: images = [] } = useQuery({
    queryKey: ["gym-gallery", gymId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gym_gallery_images" as any)
        .select("id, url, caption, sort_order")
        .eq("gym_id", gymId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as GalleryImage[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["gym-gallery", gymId] });

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const startOrder = images.length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "jpg";
        // Path MUST start with `${gymId}/` — storage RLS keys the ownership
        // check on the first `/`-separated segment. UUIDs contain hyphens, so
        // a `-` separator would only match the first UUID segment and reject
        // the upload.
        const path = `${gymId}/gallery-${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("gym-images").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("gym-images").getPublicUrl(path);
        const { error: insErr } = await supabase.from("gym_gallery_images" as any).insert({
          gym_id: gymId,
          url: pub.publicUrl,
          sort_order: startOrder + i,
        } as any);
        if (insErr) throw insErr;
      }
      invalidate();
      toast({ title: `Uploaded ${files.length} image${files.length === 1 ? "" : "s"}` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gym_gallery_images" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Image removed" }); },
    onError: (e: any) => toast({ title: "Failed to remove", description: e.message, variant: "destructive" }),
  });

  const updateCaption = async (id: string, caption: string) => {
    await supabase.from("gym_gallery_images" as any).update({ caption: caption || null } as any).eq("id", id);
    invalidate();
  };

  const swap = async (a: GalleryImage, b: GalleryImage) => {
    await supabase.from("gym_gallery_images" as any).update({ sort_order: b.sort_order } as any).eq("id", a.id);
    await supabase.from("gym_gallery_images" as any).update({ sort_order: a.sort_order } as any).eq("id", b.id);
    invalidate();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{images.length} image{images.length === 1 ? "" : "s"} in gallery</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? "Uploading..." : "Add images"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No images yet. Add photos to showcase your gym.</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {images.map((img, i) => (
            <li key={img.id} className="flex items-center gap-2 bg-muted rounded-md p-2">
              <img src={img.url} alt="" className="h-14 w-14 object-cover rounded" />
              <Input
                defaultValue={img.caption ?? ""}
                placeholder="Caption (optional)"
                className="h-8 text-xs"
                onBlur={(e) => {
                  if (e.target.value !== (img.caption ?? "")) updateCaption(img.id, e.target.value);
                }}
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => swap(img, images[i - 1])}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === images.length - 1}
                  onClick={() => swap(img, images[i + 1])}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                className="text-destructive hover:text-destructive/80 p-1"
                onClick={() => removeMut.mutate(img.id)}
                aria-label="Delete image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
