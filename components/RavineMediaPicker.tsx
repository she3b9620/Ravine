"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";

type Aspect = "square" | "cover";

type Props = {
  aspect: Aspect;
  locale: "ar" | "en";
  value: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
};

const COPY = {
  ar: {
    choose: "اختيار صورة",
    change: "تغيير الصورة",
    adjust: "تعديل الإطار",
    avatar: "الصورة الشخصية · 1:1",
    cover: "الغلاف السينمائي · 16:9",
    drag: "اسحب الصورة لضبط الكادر، واستخدم التكبير للتقريب.",
    apply: "اعتماد القص",
    applied: "تم اعتماد القص",
    reset: "إعادة ضبط",
    ready: "الصورة جاهزة للحفظ",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
  },
  en: {
    choose: "Choose image",
    change: "Change image",
    adjust: "Adjust frame",
    avatar: "Profile image · 1:1",
    cover: "Cinematic cover · 16:9",
    drag: "Drag to frame the image and use zoom to refine the crop.",
    apply: "Apply crop",
    applied: "Crop applied",
    reset: "Reset",
    ready: "Image ready to save",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
  },
};

export default function RavineMediaPicker({ aspect, locale, value, existingUrl, onChange }: Props) {
  const ar = locale === "ar";
  const copy = COPY[locale];
  const ratio = aspect === "square" ? 1 : 16 / 9;
  const output = aspect === "square" ? [1200, 1200] : [1600, 900];
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(existingUrl || null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [applied, setApplied] = useState(Boolean(value));
  const dragRef = useRef({ x: 0, y: 0, originX: 0, originY: 0 });

  useEffect(() => {
    if (value) return;
    setSourceUrl(existingUrl || null);
    setApplied(false);
    setDirty(false);
  }, [existingUrl, value]);

  useEffect(() => {
    return () => {
      if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  function resetPosition() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDirty(true);
    setApplied(false);
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDirty(true);
    setApplied(false);
    event.target.value = "";
  }

  function onLoad() {
    const image = imageRef.current;
    if (!image) return;
    setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
  }

  function metrics() {
    const viewport = viewportRef.current;
    if (!viewport || !naturalSize.width || !naturalSize.height) return null;
    const width = viewport.clientWidth;
    const height = width / ratio;
    const baseScale = Math.max(width / naturalSize.width, height / naturalSize.height);
    const scale = baseScale * zoom;
    return { width, height, scale, imageWidth: naturalSize.width * scale, imageHeight: naturalSize.height * scale };
  }

  function clampPosition(x: number, y: number) {
    const metric = metrics();
    if (!metric) return { x, y };
    const limitX = Math.max(0, (metric.imageWidth - metric.width) / 2);
    const limitY = Math.max(0, (metric.imageHeight - metric.height) / 2);
    return { x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!sourceUrl || applied) return;
    dragRef.current = { x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setOffset(clampPosition(
      dragRef.current.originX + event.clientX - dragRef.current.x,
      dragRef.current.originY + event.clientY - dragRef.current.y,
    ));
    setDirty(true);
    setApplied(false);
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function setZoomSafe(nextZoom: number) {
    const next = Math.max(1, Math.min(2.8, nextZoom));
    setZoom(next);
    requestAnimationFrame(() => setOffset((current) => clampPosition(current.x, current.y)));
    setDirty(true);
    setApplied(false);
  }

  async function applyCrop() {
    if (!sourceUrl || !naturalSize.width || !naturalSize.height) return;
    const metric = metrics();
    if (!metric) return;
    const image = imageRef.current;
    if (!image) return;

    const cropSourceWidth = metric.width / metric.scale;
    const cropSourceHeight = metric.height / metric.scale;
    const sourceX = (naturalSize.width - cropSourceWidth) / 2 - offset.x / metric.scale;
    const sourceY = (naturalSize.height - cropSourceHeight) / 2 - offset.y / metric.scale;
    const canvas = document.createElement("canvas");
    canvas.width = output[0];
    canvas.height = output[1];
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      Math.max(0, Math.min(naturalSize.width - cropSourceWidth, sourceX)),
      Math.max(0, Math.min(naturalSize.height - cropSourceHeight, sourceY)),
      cropSourceWidth,
      cropSourceHeight,
      0,
      0,
      output[0],
      output[1],
    );

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) return;
    onChange(new File([blob], aspect === "square" ? "ravine-avatar.webp" : "ravine-cover.webp", { type: "image/webp" }));
    setDirty(false);
    setApplied(true);
  }

  const previewStyle = sourceUrl && naturalSize.width
    ? (() => {
        const metric = metrics();
        if (!metric) return undefined;
        return { width: metric.imageWidth, height: metric.imageHeight, left: `calc(50% - ${metric.imageWidth / 2}px + ${offset.x}px)`, top: `calc(50% - ${metric.imageHeight / 2}px + ${offset.y}px)` };
      })()
    : undefined;

  return (
    <div className={`ravine-media-picker ravine-media-picker--${aspect}`} dir={ar ? "rtl" : "ltr"}>
      <input ref={inputRef} className="ravine-media-picker-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} />
      <div className="ravine-media-picker-head">
        <div><span>{aspect === "square" ? copy.avatar : copy.cover}</span><strong>{dirty ? copy.adjust : applied ? copy.ready : (sourceUrl ? copy.change : copy.choose)}</strong></div>
        <span className="ravine-media-ratio">{aspect === "square" ? "1:1" : "16:9"}</span>
      </div>

      {!sourceUrl ? (
        <button type="button" className="ravine-media-empty" onClick={() => inputRef.current?.click()}><span className="ravine-media-empty-icon"><ImagePlus size={20} /></span><strong>{copy.choose}</strong><small>{copy.drag}</small></button>
      ) : (
        <>
          <div ref={viewportRef} className={`ravine-media-crop${applied ? " is-applied" : ""}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} style={{ aspectRatio: `${ratio}` }}>
            <img ref={imageRef} src={sourceUrl} alt="" onLoad={onLoad} className="ravine-media-crop-image" style={previewStyle} draggable={false} />
            <div className="ravine-media-crop-frame" aria-hidden="true" />
            {applied ? <div className="ravine-media-crop-applied"><Check size={16} /><span>{copy.applied}</span></div> : <div className="ravine-media-crop-hint">{copy.drag}</div>}
          </div>
          <div className="ravine-media-controls">
            <button type="button" className="ravine-media-icon-button" onClick={() => setZoomSafe(zoom - 0.1)} disabled={zoom <= 1 || applied} aria-label={copy.zoomOut} title={copy.zoomOut}><Minus size={14} /></button>
            <label className="ravine-media-zoom"><span>{Math.round(zoom * 100)}%</span><input type="range" min="1" max="2.8" step="0.01" value={zoom} onChange={(event) => setZoomSafe(Number(event.target.value))} aria-label={ar ? "تكبير الصورة" : "Image zoom"} disabled={applied} /></label>
            <button type="button" className="ravine-media-icon-button" onClick={() => setZoomSafe(zoom + 0.1)} disabled={zoom >= 2.8 || applied} aria-label={copy.zoomIn} title={copy.zoomIn}><Plus size={14} /></button>
            <button type="button" className="ravine-media-icon-button" onClick={resetPosition} disabled={applied} aria-label={copy.reset} title={copy.reset}><RotateCcw size={15} /></button>
            <button type="button" className="ravine-media-change" onClick={() => inputRef.current?.click()}><Maximize2 size={14}/>{copy.change}</button>
            {dirty ? <button type="button" className="ravine-media-apply" onClick={() => void applyCrop()}><Check size={14}/>{copy.apply}</button> : applied ? <button type="button" className="ravine-media-applied" disabled><Check size={14}/>{copy.applied}</button> : null}
          </div>
        </>
      )}
    </div>
  );
}
