(() => {
  const source = "https://msthqpeisopneallhkpk.supabase.co/storage/";
  const proxy = `${globalThis.ASHANA_SUPABASE_URL.replace(/\/$/, "")}/storage/`;

  function rewriteMedia(element) {
    if (!(element instanceof Element)) return;
    for (const attribute of ["src", "srcset", "href", "poster", "style"]) {
      const value = element.getAttribute(attribute);
      if (value?.includes(source)) {
        element.setAttribute(attribute, value.replaceAll(source, proxy));
      }
    }
    element.querySelectorAll?.("[src], [srcset], [href], [poster], [style]").forEach(rewriteMedia);
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") rewriteMedia(record.target);
      else record.addedNodes.forEach(rewriteMedia);
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "href", "poster", "style"],
  });
  rewriteMedia(document.documentElement);
})();
