import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
gsap.registerPlugin(ScrollTrigger);

export function usePageMotion(
  root: RefObject<HTMLDivElement | null>,
  reduced: boolean,
  locale: string,
) {
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      duration: 0.85,
      smoothWheel: true,
      anchors: false,
    });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (seconds: number) => lenis.raf(seconds * 1000);
    gsap.ticker.add(tick);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        // Content is visible in CSS. Only in-view sections receive a short lift.
        gsap.from(element, {
          y: 14,
          duration: 0.24,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
            once: true,
            onEnter: (self) => {
              if (document.documentElement.dataset.input === "keyboard")
                self.animation?.progress(1);
            },
          },
        });
      });
      gsap.to(".reading-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: true },
      });
    }, root);
    const handleAnchor = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href^="#"]')
          : null;
      if (
        !anchor ||
        !root.current?.contains(anchor) ||
        anchor.hasAttribute("download")
      )
        return;
      const href = anchor.getAttribute("href")!;
      const target =
        href === "#"
          ? document.documentElement
          : document.getElementById(href.slice(1));
      if (!target) return;
      if (event.detail === 0) {
        // Finish decorative reveals before keyboard navigation. Native anchors
        // update the hash and focus; the immediate jump also cancels Lenis inertia.
        const reveals = Array.from(target.querySelectorAll("[data-reveal]"));
        if (target.matches("[data-reveal]")) reveals.push(target);
        gsap.getTweensOf(reveals).forEach((tween) => tween.progress(1));
        lenis.scrollTo(target, { immediate: true });
        return;
      }
      event.preventDefault();
      history.pushState(null, "", href);
      lenis.scrollTo(target, {
        onComplete: () => target.focus({ preventScroll: true }),
      });
    };
    document.addEventListener("click", handleAnchor);
    const stopKeyboardMotion = () => {
      // Native PageDown/Space/arrow scrolling must also stay immediate.
      gsap
        .getTweensOf(root.current?.querySelectorAll("[data-reveal]") ?? [])
        .forEach((tween) => tween.progress(1));
    };
    document.addEventListener("keydown", stopKeyboardMotion);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    let alive = true;
    document.fonts.ready.then(() => {
      if (alive) refresh();
    });
    return () => {
      alive = false;
      window.removeEventListener("load", refresh);
      document.removeEventListener("click", handleAnchor);
      document.removeEventListener("keydown", stopKeyboardMotion);
      context.revert();
      gsap.ticker.remove(tick);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, [reduced, root]);
  // Recompute bounds after translation without replaying entry animations.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [locale]);
}
