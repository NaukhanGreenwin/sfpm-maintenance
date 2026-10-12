"use client";

import { useCallback, useRef, useState } from "react";
import type { MediaItem } from "@/lib/types";
import { ACCEPT_ATTR, MEDIA_LIMITS, classify, compressImage, formatBytes, newMediaItem, validateFile } from "@/lib/media";
import { IconCamera, IconClose, IconImages, IconPlay } from "./icons";

interface Props {
  items: MediaItem[];
  onChange: (updater: (prev: MediaItem[]) => MediaItem[]) => void;
}

export default function MediaUploader({ items, onChange }: Props) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const remaining = MEDIA_LIMITS.maxFiles - items.length;

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list);
      const problems: string[] = [];
      const accepted: { file: File; item: MediaItem }[] = [];
      let room = MEDIA_LIMITS.maxFiles - items.length;
      for (const file of files) {
        const err = validateFile(file);
        if (err) { problems.push(err); continue; }
        if (room <= 0) { problems.push(`You can add up to ${MEDIA_LIMITS.maxFiles} files. ${file.name} was not added.`); continue; }
        const kind = classify(file)!;
        accepted.push({ file, item: newMediaItem(file, kind) });
        room -= 1;
      }
      setMessages(problems);
      if (!accepted.length) return;
      onChange((prev) => [...prev, ...accepted.map((a) => a.item)]);
      for (const { file, item } of accepted) {
        if (item.kind !== "image") continue;
        compressImage(file).then(({ blob, compressed }) => {
          onChange((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, blob, compressed, finalBytes: blob.size, status: "ready" } : m)),
          );
        });
      }
    },
    [items.length, onChange],
  );

  const remove = (id: string) => {
    onChange((prev) => {
      const gone = prev.find((m) => m.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((m) => m.id !== id);
    });
  };

  const setCaption = (id: string, caption: string) =>
    onChange((prev) => prev.map((m) => (m.id === id ? { ...m, caption } : m)));

  return (
    <div className="media">
      <div
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
      >
        <div className="dropzone-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={() => libraryRef.current?.click()} disabled={remaining <= 0}>
            <IconImages size={22} />
            <span>Add photos or video</span>
          </button>
          <button type="button" className="btn btn-quiet btn-block" onClick={() => cameraRef.current?.click()} disabled={remaining <= 0}>
            <IconCamera size={22} />
            <span>Open camera</span>
          </button>
        </div>
        <p className="dropzone-hint">
          <span className="only-fine">Or drag files here. </span>
          Up to {MEDIA_LIMITS.maxFiles} files. Photos are resized on your device before upload; videos up to {formatBytes(MEDIA_LIMITS.videoMaxBytes)}.
        </p>
        <input ref={libraryRef} type="file" accept={ACCEPT_ATTR} multiple hidden
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" hidden
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
      </div>

      <div aria-live="polite" className="media-messages">
        {messages.map((m) => (<p key={m} className="field-error">{m}</p>))}
      </div>

      {items.length > 0 && (
        <>
          <p className="media-count">
            <span className="tnum">{items.length}</span> of {MEDIA_LIMITS.maxFiles} added
          </p>
          <ul className="thumbs">
            {items.map((m, i) => (
              <li key={m.id} className="thumb">
                <div className="thumb-frame">
                  {m.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.previewUrl} alt={m.caption || `Photo ${i + 1}`} />
                  ) : (
                    <>
                      <video src={`${m.previewUrl}#t=0.1`} muted playsInline preload="metadata" aria-label={m.caption || `Video ${i + 1}`} />
                      <span className="thumb-badge"><IconPlay size={14} /> Video</span>
                    </>
                  )}
                  {m.status === "processing" && <span className="thumb-status">Optimising</span>}
                  <button type="button" className="thumb-remove" onClick={() => remove(m.id)}
                    aria-label={`Remove ${m.kind} ${i + 1}${m.caption ? `, ${m.caption}` : ""}`}>
                    <IconClose size={18} />
                  </button>
                </div>
                <input id={`cap-${m.id}`} className="thumb-caption" type="text" maxLength={80}
                  aria-label={`Caption for ${m.kind} ${i + 1}, optional`}
                  placeholder="Add a caption (optional)" value={m.caption}
                  onChange={(e) => setCaption(m.id, e.target.value)} />
                <p className="thumb-meta tnum">
                  {m.status === "processing" ? "Preparing..." : m.compressed
                    ? `${formatBytes(m.finalBytes)}, reduced from ${formatBytes(m.originalBytes)}`
                    : formatBytes(m.finalBytes)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
