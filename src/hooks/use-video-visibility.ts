import { useEffect, type RefObject } from "react";

/**
 * Mantém vídeos em reprodução somente quando estão próximos da área visível.
 * Isso evita que várias seções consumam memória e CPU ao mesmo tempo.
 */
export function useVideoVisibility(ref: RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "20% 0px", threshold: 0.01 },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [ref]);
}
