"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";

type Props = {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function ImageCropper({
  imageSrc,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!area) return;
    const blob = await getCroppedImg(imageSrc, area);
    if (blob) onConfirm(blob);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="p-4" style={{ background: "#0a1810" }}>
        <div className="mx-auto max-w-md">
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--gold)" }}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-xl border py-3 text-sm font-bold transition disabled:opacity-50"
              style={{ borderColor: "rgba(255,255,255,0.2)", color: "var(--dim)" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 rounded-xl py-3 text-sm font-bold transition disabled:opacity-50"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              {loading ? "Guardando..." : "Guardar foto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Genera un blob recortado usando canvas
// ────────────────────────────────────────────────────────────────
async function getCroppedImg(
  imageSrc: string,
  crop: Area
): Promise<Blob | null> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = 512; // 512x512 es más que suficiente para un avatar
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      "image/jpeg",
      0.9
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}