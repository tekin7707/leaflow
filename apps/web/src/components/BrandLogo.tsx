import wordmark from '../assets/leaflow-wordmark.png';
import vertical from '../assets/leaflow-vertical.png';

type BrandLogoProps = {
  variant?: 'wordmark' | 'vertical';
  className?: string;
};

export function BrandLogo({ variant = 'wordmark', className = '' }: BrandLogoProps) {
  const src = variant === 'vertical' ? vertical : wordmark;
  return <img className={`brand-logo brand-logo--${variant} ${className}`.trim()} src={src} alt="Leaflow" />;
}
