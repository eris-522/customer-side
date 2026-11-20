import React, { useEffect, useState } from "react";
import { isSafeRasterDataUrl, resolvePrivateReceiptUrl } from "../utils/storageMedia";

interface SignedStorageImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  fallback?: React.ReactNode;
}

export function SignedStorageImage({
  src,
  fallback = null,
  className = "",
  alt = "",
  onError,
  ...rest
}: SignedStorageImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(() => {
    if (!src) return null;
    return isSafeRasterDataUrl(src) ? src : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return Boolean(src) && !isSafeRasterDataUrl(src);
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setHasError(false);

    if (!src) {
      setResolvedUrl(null);
      setIsLoading(false);
      return;
    }

    if (isSafeRasterDataUrl(src)) {
      setResolvedUrl(src);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    resolvePrivateReceiptUrl(src)
      .then((url) => {
        if (!active) return;
        setResolvedUrl(url);
        if (!url) setHasError(true);
      })
      .catch(() => {
        if (!active) return;
        setResolvedUrl(null);
        setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (isLoading) {
    return (
      <div
        aria-label={alt || "Loading image"}
        className={`animate-pulse bg-white/10 ${className}`}
      />
    );
  }

  if (hasError || !resolvedUrl) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
      {...rest}
    />
  );
}
