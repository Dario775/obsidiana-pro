const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '';
const apiSecret = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || '';

console.log('Cloudinary ENV:', { cloudName, apiKey: !!apiKey, apiSecret: !!apiSecret });

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  isGlobal?: boolean;
  barcode?: string;
}

export function validateImageFile(
  file: File,
  maxSizeBytes: number = 2 * 1024 * 1024
): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No se seleccionó ningún archivo.' };
  }
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `El archivo supera el tamaño máximo permitido de ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB para optimizar el rendimiento del sistema.`
    };
  }

  // Restringir a formatos rasterizados seguros (JPEG, PNG, WEBP).
  // Excluir explícitamente SVG/HTML para evitar inyección de código malicioso (XSS).
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Formato de imagen no permitido. Solo se aceptan archivos JPG, PNG o WEBP por motivos de seguridad.'
    };
  }

  // Validar extensión de archivo
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const fileNameParts = file.name.split('.');
  if (fileNameParts.length < 2) {
    return {
      isValid: false,
      error: 'Nombre de archivo inválido.'
    };
  }
  const fileExt = fileNameParts.pop()?.toLowerCase();
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    return {
      isValid: false,
      error: 'Extensión de archivo no permitida. Solo se aceptan extensiones .jpg, .jpeg, .png o .webp.'
    };
  }

  // Protección contra Spoofing de extensiones dobles (ej. imagen.html.png, imagen.js.webp, etc.)
  const containsSuspiciousExtension = fileNameParts.some(part => {
    const lowerPart = part.toLowerCase();
    return ['svg', 'html', 'htm', 'js', 'php', 'aspx', 'jsp', 'sh', 'bat', 'exe'].includes(lowerPart);
  });
  if (containsSuspiciousExtension) {
    return {
      isValid: false,
      error: 'Inyección o spoofing detectado. Por razones de seguridad, el nombre del archivo no puede contener extensiones ejecutables o de código (.svg, .html, .js, etc.).'
    };
  }

  return { isValid: true };
}

export async function uploadImageToCloudinary(
  file: File | string,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult | null> {
  if (!cloudName || !apiKey) {
    console.error('Cloudinary credentials not configured');
    return null;
  }

  if (file instanceof File) {
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      console.error('Security/Validation Error:', validation.error);
      if (typeof window !== 'undefined') {
        alert(validation.error);
      }
      return null;
    }
  }

  if (typeof file === 'string' && file.startsWith('http')) {
    return {
      public_id: '',
      secure_url: file,
      width: 0,
      height: 0,
      format: 'url',
      bytes: 0
    };
  }

  if (typeof file === 'string') {
    return { public_id: '', secure_url: file, width: 0, height: 0, format: 'url', bytes: 0 };
  }

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const folder = determineFolder(options);
  const publicId = options.publicId || options.barcode || undefined;

  const formData = new FormData();
  formData.append('file', base64);
  formData.append('upload_preset', 'obsidiana');
  formData.append('folder', folder);

  if (publicId) {
    formData.append('public_id', publicId);
  }

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    const responseText = await response.text();
    console.log('Cloudinary response:', response.status, responseText.substring(0, 200));

    if (!response.ok) {
      throw new Error('Upload failed: ' + responseText.substring(0, 100));
    }

    const data = JSON.parse(responseText);
    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
}

function determineFolder(options: UploadOptions): string {
  if (options.isGlobal || options.barcode) {
    return 'obsidiana/global_library';
  }
  return options.folder || 'obsidiana/tenants';
}

export async function deleteImageFromCloudinary(publicId: string): Promise<boolean> {
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary credentials not configured');
    return false;
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = await generateSignature(publicId, timestamp);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: publicId, api_key: apiKey, timestamp, signature })
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

async function generateSignature(publicId: string, timestamp: number): Promise<string> {
  const crypto = await import('crypto');
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  return crypto.createHash('sha1').update(signatureString).digest('hex');
}

export interface TransformOptions {
  width?: number;
  height?: number;
  crop?: 'scale' | 'fit' | 'fill' | 'thumb' | 'crop';
  thumb?: number;
  quality?: 'auto' | number;
  fill?: boolean;
  fit?: boolean;
  grayscale?: boolean;
  sepia?: boolean;
  brightness?: number;
  contrast?: number;
  effect?: string;
}

export function getCloudinaryUrl(publicId: string, options: TransformOptions = {}): string {
  if (!cloudName || !publicId) return '';
  
  const transforms: string[] = ['f_auto', 'q_auto'];
  
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  
  if (options.thumb) {
    transforms.push('c_thumb', `w_${options.thumb}`, `h_${options.thumb}`, 'g_auto');
  } else if (options.crop === 'thumb') {
    transforms.push('c_thumb', 'g_auto');
  } else if (options.crop) {
    transforms.push(`c_${options.crop}`);
  }
  
  if (options.fill) transforms.push('c_fill');
  if (options.fit) transforms.push('c_fit');
  if (options.grayscale) transforms.push('e_grayscale');
  if (options.sepia) transforms.push('e_sepia');
  if (options.brightness) transforms.push(`e_brightness:${options.brightness}`);
  if (options.contrast) transforms.push(`e_contrast:${options.contrast}`);
  if (options.effect) transforms.push(options.effect);
  
  const transformString = transforms.length > 0 ? transforms.join(',') + '/' : '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}${publicId}`;
}

export function getThumbnailUrl(publicId: string, size: number = 200): string {
  return getCloudinaryUrl(publicId, { thumb: size });
}

export function getPreviewUrl(publicId: string, size: number = 400): string {
  return getCloudinaryUrl(publicId, { width: size, crop: 'scale' });
}

export function getFullsizeUrl(publicId: string): string {
  return getCloudinaryUrl(publicId, {});
}

export function getPOSThumbnailUrl(publicId: string): string {
  return getCloudinaryUrl(publicId, {
    thumb: 200,
    brightness: 10,
    contrast: 10
  });
}

export function buildImageUrl(
  publicId: string,
  usage: 'list' | 'detail' | 'thumbnail' | 'full' | 'pos' = 'detail'
): string {
  switch (usage) {
    case 'list':
      return getCloudinaryUrl(publicId, { width: 400, crop: 'scale' });
    case 'thumbnail':
      return getCloudinaryUrl(publicId, { thumb: 150 });
    case 'full':
      return getCloudinaryUrl(publicId, {});
    case 'pos':
      return getPOSThumbnailUrl(publicId);
    case 'detail':
    default:
      return getCloudinaryUrl(publicId, { width: 800, crop: 'scale' });
  }
}

export function extractPublicId(cloudinaryUrl: string): string | null {
  if (!cloudinaryUrl) return null;
  
  const match = cloudinaryUrl.match(/upload\/(?:v\d+\/)?([^\.]+)/);
  return match?.[1] ?? null;
}

export function isGlobalImage(publicId: string): boolean {
  return publicId.startsWith('obsidiana/global_library/');
}

export async function moveToGlobalLibrary(
  publicId: string,
  newBarcode: string
): Promise<{ success: boolean; newPublicId?: string; error?: string }> {
  return {
    success: true,
    newPublicId: `obsidiana/global_library/${newBarcode}`
  };
}