import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CompanyMark } from './company-mark';

const MAX_SIDE = 320;
const ACCEPT = 'image/png,image/jpeg,image/webp';

/** Downscales the picked image in the browser so the stored logo stays small (the API caps it at ~200 KB). */
async function toLogoDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL('image/webp', 0.9);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function LogoInput({ value, onChange, name }: { value: string; onChange: (logo: string) => void; name?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return toast.error('Use a PNG, JPEG or WebP image');
    setBusy(true);
    try {
      onChange(await toLogoDataUrl(file));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <CompanyMark name={name} logo={value} className="h-14 w-14 border text-lg" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          <ImagePlus className="mr-1.5 h-3.5 w-3.5" />{busy ? 'Processing…' : value ? 'Change logo' : 'Upload logo'}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
            <X className="mr-1 h-3.5 w-3.5" />Remove
          </Button>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
