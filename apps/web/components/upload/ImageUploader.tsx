'use client';

import { useState, useRef, useEffect } from 'react';
import { uploadImageToCloudinary, getCloudinaryUrl, getThumbnailUrl } from '@/lib/cloudinary';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
  placeholder?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'any';
  isGlobal?: boolean;
  barcode?: string;
  usageHint?: 'list' | 'detail' | 'thumbnail' | 'full' | 'pos';
}

export function ImageUploader({
  value,
  onChange,
  folder = 'obsidiana',
  accept = 'image/*',
  maxSizeMB = 10,
  placeholder = 'Click or drag to upload',
  className = '',
  aspectRatio = 'any',
  isGlobal = false,
  barcode,
  usageHint
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayUrl, setDisplayUrl] = useState(value);

  useEffect(() => {
    if (!value) {
      setDisplayUrl('');
      return;
    }
    
    if (usageHint && value.includes('cloudinary.com')) {
      const publicIdMatch = value.match(/upload\/(?:v\d+\/)?([^\.]+)/);
      if (publicIdMatch && publicIdMatch[1]) {
        const publicId = publicIdMatch[1];
        if (usageHint === 'thumbnail') {
          setDisplayUrl(getThumbnailUrl(publicId, 150));
        } else if (usageHint === 'list') {
          setDisplayUrl(getCloudinaryUrl(publicId, { width: 400 }));
        } else if (usageHint === 'pos') {
          setDisplayUrl(getThumbnailUrl(publicId, 200));
        } else if (usageHint === 'full') {
          setDisplayUrl(getCloudinaryUrl(publicId, {}));
        } else {
          setDisplayUrl(getCloudinaryUrl(publicId, { width: 800 }));
        }
        return;
      }
    }
    setDisplayUrl(value);
  }, [value, usageHint]);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    any: 'aspect-[4/3]'
  };

const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Máximo ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    setError('');
    try {
      const result = await uploadImageToCloudinary(file, { 
        folder,
        isGlobal,
        barcode
      });
      
      if (result?.secure_url) {
        onChange(result.secure_url);
      } else {
        setError('Error al subir imagen');
      }
    } catch (err) {
      setError('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          relative ${aspectClasses[aspectRatio]}
          border-2 border-dashed rounded-xl cursor-pointer
          flex items-center justify-center
          transition-all duration-200
          ${dragOver ? 'border-primary bg-primary/5' : 'border-white/20 hover:border-white/40'}
          ${uploading ? 'opacity-50 cursor-wait' : ''}
          bg-zinc-900/50 overflow-hidden group
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">cloud_upload</span>
              <span className="text-white ml-2 font-medium">Cambiar</span>
            </div>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
            <span className="text-xs text-zinc-400 mt-2">Subiendo...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-4">
            <span className="material-symbols-outlined text-3xl text-zinc-600">add_photo_alternate</span>
            <span className="text-xs text-zinc-500 mt-2">{placeholder}</span>
            <span className="text-[10px] text-zinc-600">máx {maxSizeMB}MB</span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
      
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-lg"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  );
}

interface MultiImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  maxImages?: number;
  aspectRatio?: 'square' | 'video' | 'any';
}

export function MultiImageUploader({
  images,
  onChange,
  folder = 'obsidiana',
  maxImages = 5,
  aspectRatio = 'square'
}: MultiImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (url: string) => {
    if (images.length >= maxImages) return;
    setUploading(true);
    try {
      const result = await uploadImageToCloudinary(url, { folder });
      if (result?.secure_url) {
        onChange([...images, result.secure_url]);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const removed = newImages[fromIndex];
    if (removed) {
      newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, removed);
      onChange(newImages);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {images.map((url, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
        ))}
        
        {images.length < maxImages && (
          <label className="aspect-square border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  Array.from(files).forEach(file => handleUpload(URL.createObjectURL(file)));
                }
              }}
            />
            {uploading ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-zinc-500">add</span>
            )}
          </label>
        )}
      </div>
      
      <p className="text-xs text-zinc-500">
        {images.length}/{maxImages} imágenes • Arrastra para reorderar
      </p>
    </div>
  );
}