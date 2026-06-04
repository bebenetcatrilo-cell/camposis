'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { subirLogoAction, quitarLogoAction } from '@/lib/actions/configuracion';

export function UploadLogo({ logoActual }: { logoActual: string | null }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(logoActual);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    // Preview local inmediato
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('logo', file);

    const r = await subirLogoAction(formData);
    setUploading(false);

    if (r?.error) {
      setError(r.error);
      setPreview(logoActual); // revertir preview
    } else if (r?.logo_url) {
      setPreview(r.logo_url);
      router.refresh();
    }
  }

  async function handleQuitar() {
    if (!confirm('¿Quitar el logo actual?')) return;
    setUploading(true);
    setError(null);
    const r = await quitarLogoAction();
    setUploading(false);
    if (r?.error) {
      setError(r.error);
    } else {
      setPreview(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Logo del campo</label>

      <div className="flex items-start gap-4 flex-wrap">
        {/* Preview */}
        <div className="w-32 h-32 bg-[var(--bg-hover)] border-2 border-dashed border-[var(--border)] rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Logo"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center text-[var(--fg-muted)]">
              <div className="text-3xl mb-1">🖼️</div>
              <div className="text-xs">Sin logo</div>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex-1 min-w-[240px] space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm text-sm disabled:opacity-60"
          >
            {uploading ? 'Subiendo...' : preview ? '🔄 Cambiar logo' : '📤 Subir logo'}
          </button>

          {preview && (
            <button
              type="button"
              onClick={handleQuitar}
              disabled={uploading}
              className="w-full px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
            >
              🗑 Quitar logo
            </button>
          )}

          <p className="text-xs text-[var(--fg-muted)]">
            JPG, PNG, WebP o SVG. Máximo 2 MB.
            <br />
            Recomendado: 400×400px transparente.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-3 py-2 rounded-lg">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
