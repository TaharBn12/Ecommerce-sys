/**
 * Landing-page sticky "Order Now" CTA (theme layer).
 *
 * The fixed bottom button is visible while the order form is out of view
 * and hides the moment any part of the form enters the viewport — the CTA
 * and the form's own submit button must never compete for the tap. The
 * anchor href does the scrolling (html has scroll-behavior: smooth), so
 * no-JS visitors still get a working jump-to-form link.
 */

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initLpStickyCta());
  } else {
    initLpStickyCta();
  }
}

export function initLpStickyCta(): void {
  const cta = document.getElementById("lp-sticky-cta");
  const form = document.getElementById("order-section-wrapper");
  if (!cta || !form) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      cta.classList.toggle("is-hidden", entry.isIntersecting);
    },
    { threshold: 0 }
  );
  observer.observe(form);
}
