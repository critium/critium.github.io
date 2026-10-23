// The critium bar: the top of every critium page on Pages (critium.github.io/<repo>/…), so you
// always know you're on critium and can reach the dashboard, the other projects and this
// project's sections. Each repo's README layout and hosted javadoc load it with
//   <script src="/nav.js" defer></script>
// It is the only list of projects and sections outside the dashboard: add a project here.
(() => {
  const projects = [
    { group: "forj", name: "forj-core", base: "/forj/", github: "critium/forj",
      sections: ["docs", "api", "examples"] },
    { group: "forj", name: "forj-codec", base: "/forj-codec/", github: "critium/forj-codec",
      sections: ["docs", "api", "jackson", "tck"] },
    { group: "forj", name: "forj-http", base: "/forj-http/", github: "critium/forj-http",
      sections: ["api", "json"] },
    { group: "forj", name: "forj-http-plugins", base: "/forj-http-plugins/", github: "critium/forj-http-plugins",
      sections: ["docs", "api"] },
    { name: "magnetite", href: "https://github.com/critium/magnetite", github: "critium/magnetite" },
  ];

  const path = location.pathname;
  const current = projects.find((p) => p.base && path.startsWith(p.base));
  const section = current && current.sections.find((s) => path.startsWith(current.base + s + "/"));

  const el = (tag, attrs = {}, text) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    return e;
  };

  const css = el("link", { rel: "stylesheet", href: "/nav.css" });
  document.head.append(css);

  const bar = el("nav", { class: "critium-bar", "aria-label": "critium" });

  // tabline: the dashboard, then each project, grouped
  const tabs = el("div", { class: "cb-tabs" });
  tabs.append(el("a", { class: "cb-tab cb-home", href: "/" }, "critium"));
  let group;
  for (const p of projects) {
    if (p.group !== group) {
      tabs.append(el("span", { class: "cb-sep" }, "│"));
      if (p.group) tabs.append(el("span", { class: "cb-group" }, p.group));
      group = p.group;
    }
    const tab = el("a", { class: "cb-tab", href: p.base || p.href }, p.group ? p.name.replace(p.group + "-", "") : p.name);
    if (p === current) tab.classList.add("active");
    tabs.append(tab);
  }
  tabs.append(el("span", { class: "cb-fill" }));
  tabs.append(el("a", { class: "cb-tab cb-right", href: "https://github.com/" + (current ? current.github : "critium") }, "github"));
  bar.append(tabs);

  // winbar: where you are in this project, and its sections
  if (current) {
    const win = el("div", { class: "cb-winbar" });
    win.append(el("span", { class: "cb-crumb" }, current.name));
    win.append(el("span", { class: "cb-sep" }, "›"));
    const readme = el("a", { href: current.base }, "README.md");
    if (!section) readme.classList.add("active");
    win.append(readme);
    for (const s of current.sections) {
      const a = el("a", { href: current.base + s + "/" }, s);
      if (s === section) a.classList.add("active");
      win.append(a);
    }
    bar.append(win);
  }

  function mount() {
    // README pages: replace their own tab bar. Javadoc: join its sticky header.
    const old = document.querySelector("body > nav.tabline");
    const header = document.querySelector('header[role="banner"]');
    if (old) old.replaceWith(bar);
    else if (header) header.prepend(bar);
    else document.body.prepend(bar);
    document.documentElement.classList.add("has-critium-bar");
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
