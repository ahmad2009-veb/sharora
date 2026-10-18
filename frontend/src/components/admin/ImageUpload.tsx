"use client";

import { useMutation } from "@tanstack/react-query";
import { ImageOff, Loader2, Upload } from "lucide-react";
import { useId } from "react";

import { useToast } from "@/components/ui/Toast";
import { adminApi, ApiError, mediaUrl } from "@/lib/api";

type Props = {
  label: string;
  value: string | null;
  subdir: "floors" | "units" | "blocks";
  onUploaded: (url: string) => void;
};

export function ImageUpload({ label, value, subdir, onUploaded }: Props) {
  const id = useId();
  const toast = useToast();
  const upload = useMutation({
    mutationFn: (file: File) => adminApi.upload(file, subdir),
    onSuccess: ({ url }) => onUploaded(url),
    onError: (e) => toast(e instanceof ApiError ? e.message : "Не удалось загрузить файл", "error"),
  });
  const src = mediaUrl(value);

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-sand">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an uploaded file
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageOff className="size-5 text-muted" aria-hidden />
          )}
        </div>
        <label
          htmlFor={id}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-gold hover:border-ink/40"
        >
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {src ? "Заменить" : "Загрузить"}
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
