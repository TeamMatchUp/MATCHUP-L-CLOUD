import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

interface GymGallerySectionProps {
  gymId: string;
}

interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  sort_order: number;
}

export function GymGallerySection({ gymId }: GymGallerySectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  if (images.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: "0.08em",
          fontSize: 13,
          color: "hsl(var(--primary))",
          marginBottom: 12,
        }}
      >
        GALLERY
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img
              src={img.url}
              alt={img.caption ?? "Gym gallery image"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <figure className="max-w-5xl max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightboxIndex].url}
              alt={images[lightboxIndex].caption ?? "Gym image"}
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
            {images[lightboxIndex].caption && (
              <figcaption className="text-sm text-white/80 text-center">{images[lightboxIndex].caption}</figcaption>
            )}
          </figure>
        </div>
      )}
    </section>
  );
}
