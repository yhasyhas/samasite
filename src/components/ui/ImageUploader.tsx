import React, { useState, useRef } from 'react';
import { Upload, Link, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { ProductImage } from '../../types';

/* ============================================================
   UPLOAD MULTIPLE (Produits)
   ============================================================ */

interface ImageUploaderProps {
  value: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxFiles?: number;
  folder?: string;
  accept?: string;
}

export function ImageUploader({
  value,
  onChange,
  maxFiles = 5,
  folder = 'products',
  accept = 'image/*',
}: ImageUploaderProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [altInput, setAltInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} image${maxFiles > 1 ? 's' : ''}`);
      return;
    }

    setUploading(true);

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 5MB`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        toast.error(`Échec upload : ${uploadError.message}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      onChange([...value, { url: publicUrl, alt: file.name }]);
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    if (value.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} image${maxFiles > 1 ? 's' : ''}`);
      return;
    }
    onChange([...value, { url: urlInput.trim(), alt: altInput.trim() || 'Image' }]);
    setUrlInput('');
    setAltInput('');
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateAlt = (index: number, alt: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], alt };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Toggle mode */}
      <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          <Upload size={13} />
          Uploader
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'url' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          <Link size={13} />
          URL externe
        </button>
      </div>

      {mode === 'upload' ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || value.length >= maxFiles}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload size={16} />
                Cliquez pour sélectionner {maxFiles > 1 ? 'des images' : 'une image'}
                <span className="text-xs text-slate-400 ml-1">(max 5MB)</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://exemple.com/image.jpg"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <input
              type="text"
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              placeholder="Description"
              className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
              className="px-3 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Previews */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((img, idx) => (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-24 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="p-1.5 bg-white rounded-lg text-red-600 hover:bg-red-50"
                  title="Supprimer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-2">
                <input
                  type="text"
                  value={img.alt}
                  onChange={(e) => updateAlt(idx, e.target.value)}
                  placeholder="Alt text"
                  className="w-full text-xs bg-transparent border-none p-0 focus:ring-0 text-slate-600 placeholder-slate-400"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        {value.length} / {maxFiles} image{maxFiles > 1 ? 's' : ''}
      </p>
    </div>
  );
}

/* ============================================================
   UPLOAD SINGLE (Logo, Favicon, Catégorie)
   ============================================================ */

interface SingleImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export function SingleImageUploader({ value, onChange, folder = 'logos' }: SingleImageUploaderProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (max 5MB)');
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      toast.error(`Échec upload : ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
    onChange(publicUrl);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          <Upload size={13} /> Uploader
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'url' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          <Link size={13} /> URL
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-slate-400 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Upload...' : 'Choisir un fichier'}
          </button>
          {value && (
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="https://..."
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      )}
    </div>
  );
}