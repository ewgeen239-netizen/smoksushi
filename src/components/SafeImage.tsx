import { useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** proporcje kontenera — zdjęcie nigdy nie rozjeżdża layoutu */
  ratio?: 'square' | 'photo' | 'wide' | 'hero';
  eager?: boolean;
};

const RATIOS: Record<NonNullable<Props['ratio']>, string> = {
  square: 'aspect-square',
  photo: 'aspect-[4/3]',
  wide: 'aspect-[16/10]',
  hero: 'aspect-[4/5] sm:aspect-[16/9]',
};

/**
 * Obrazek z twardym kontenerem proporcji i fallbackiem.
 * Nawet gdy plik nie wczyta się (offline / zły URL), karta trzyma wymiar.
 */
export default function SafeImage({ src, alt, className = '', ratio = 'photo', eager }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-ink-700 ${RATIOS[ratio]} ${className}`}>
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      {(failed || !loaded) && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-ink-700 to-ink-800">
          <span className="display text-[11px] tracking-[0.25em] text-cream/30">SUSHI SMOK</span>
        </div>
      )}
    </div>
  );
}
