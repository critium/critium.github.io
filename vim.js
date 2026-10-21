// Vim keys for the page. The cursor is the focused link: j/k move between links in
// the current pane, h/l move between neo-tree and the editor, Enter follows the link.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const tree = $(".tree");
  const editor = $(".editor");
  const buffers = $$(".buf");
  const body = document.body;
  const msg = $("#msg");
  const cmdWrap = $("#cmdwrap");
  const cmd = $("#cmd");
  const showcmd = $("#showcmd");

  const visible = (el) => el.offsetParent !== null;
  const links = (pane) => $$("a[href]", pane).filter(visible);

  let pane = editor;
  let cursor = null;
  let pending = "";

  // cursor

  function place(link, scroll = true) {
    if (!link) return;
    if (cursor) cursor.classList.remove("cursor");
    cursor = link;
    pane = tree.contains(link) ? tree : editor;
    link.classList.add("cursor");
    link.focus({ preventScroll: true });
    if (scroll) link.scrollIntoView({ block: "nearest" });
    status();
  }

  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };

  function step(delta) {
    const list = links(pane);
    if (!list.length) return;
    // after scrolling with the mouse, start from what's on screen
    if (!cursor || !onScreen(cursor)) {
      const shown = list.filter(onScreen);
      return place((delta > 0 ? shown[0] : shown.at(-1)) || nearest(list));
    }
    const i = list.indexOf(cursor);
    const next = i < 0 ? 0 : Math.max(0, Math.min(list.length - 1, i + delta));
    place(list[next]);
  }

  // the link nearest the middle of the screen, so h/l land somewhere sensible
  function nearest(list) {
    const mid = innerHeight / 2;
    return list.reduce((best, a) => {
      const d = Math.abs(a.getBoundingClientRect().top - mid);
      return !best || d < best.d ? { a, d } : best;
    }, null)?.a;
  }

  function firstLinkOnScreen() {
    return links(editor).find((a) => a.getBoundingClientRect().top >= 0) || links(editor)[0];
  }

  function openBuffer(id) {
    const buf = document.getElementById(id);
    if (!buf) return false;
    buf.scrollIntoView();
    place(links(buf)[0]);
    return true;
  }

  function follow(link) {
    const href = link.getAttribute("href");
    if (href.startsWith("#")) openBuffer(href.slice(1));
    else location.href = href;
  }

  // statusline, tabline

  function currentBuffer() {
    if (cursor && editor.contains(cursor) && onScreen(cursor)) return cursor.closest(".buf");
    let cur = buffers[0];
    for (const b of buffers) if (b.getBoundingClientRect().top <= innerHeight * 0.4) cur = b;
    return cur;
  }

  function status() {
    const buf = currentBuffer();
    $("#file").textContent = buf.dataset.name;
    $("#ft").textContent = buf.dataset.ft;
    $$(".tab[data-buf]").forEach((t) => t.classList.toggle("active", t.dataset.buf === buf.id));

    const max = document.documentElement.scrollHeight - innerHeight;
    $("#progress").textContent =
      scrollY <= 0 ? "Top" : scrollY >= max - 1 ? "Bot" : Math.round((scrollY / max) * 100) + "%";

    let line = 1, col = 1;
    const ln = cursor && cursor.closest(".ln");
    if (ln) {
      const sec = ln.closest(".buf");
      line = $$(".ln", sec).indexOf(ln) + 1;
      col = ln.textContent.indexOf(cursor.textContent) + 1 || 1;
    } else if (cursor && editor.contains(cursor)) {
      line = links(cursor.closest(".buf")).indexOf(cursor) + 1;
    }
    $("#loc").textContent = `${line}:${col}`;
  }

  function echo(text, err = false) {
    msg.textContent = text;
    msg.classList.toggle("err", err);
  }

  // command line

  function openCmd() {
    body.classList.add("cmd-mode");
    $("#mode").textContent = "COMMAND";
    msg.hidden = true;
    cmdWrap.hidden = false;
    cmd.value = "";
    cmd.focus();
  }

  function closeCmd() {
    body.classList.remove("cmd-mode");
    $("#mode").textContent = "NORMAL";
    cmdWrap.hidden = true;
    msg.hidden = false;
    if (cursor) cursor.focus({ preventScroll: true });
  }

  const names = { dashboard: "dashboard", forj: "forj", magnetite: "magnetite", mgt: "magnetite" };

  function run(line) {
    const [name, ...rest] = line.trim().split(/\s+/);
    const arg = rest.join(" ").replace(/\.md$/, "");
    if (!name) return;
    if (/^\d+$/.test(name)) {
      const ln = $$(".ln", currentBuffer())[+name - 1];
      if (ln) ln.scrollIntoView({ block: "center" });
      return;
    }
    switch (name) {
      case "e": case "edit": case "b": case "buffer": case "tabn":
        if (names[arg]) openBuffer(names[arg]);
        else echo(`E94: No matching buffer for ${arg}`, true);
        return;
      case "forj": case "magnetite": case "dashboard": case "Alpha":
        openBuffer(names[name] || "dashboard");
        return;
      case "Neotree": case "NvimTreeToggle":
        if (visible(tree)) place(nearest(links(tree)));
        return;
      case "q": case "qa": case "wq": case "x":
        echo("E37: No write since last change (add ! to override)", true);
        return;
      case "q!": case "qa!":
        location.href = "https://github.com/critium";
        return;
      case "w":
        echo('"critium.github.io" written');
        return;
      case "colorscheme": case "colo":
        echo("catppuccin");
        return;
      case "h": case "help":
        echo("hjkl move · <CR> open · gt/gT buffers · gg/G · f/m jump · :e forj · :q");
        return;
    }
    echo(`E492: Not an editor command: ${line.trim()}`, true);
  }

  $("#cmdform").addEventListener("submit", (e) => {
    e.preventDefault();
    const line = cmd.value;
    closeCmd();
    run(line);
  });

  cmd.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || (e.key === "Backspace" && !cmd.value)) {
      e.preventDefault();
      closeCmd();
    }
  });

  // normal mode

  const order = buffers.map((b) => b.id);

  function cycle(delta) {
    const i = order.indexOf(currentBuffer().id);
    openBuffer(order[(i + delta + order.length) % order.length]);
  }

  document.addEventListener("keydown", (e) => {
    if (e.target === cmd || e.metaKey || e.altKey) return;

    if (e.ctrlKey) {
      if (e.key === "d" || e.key === "u") {
        e.preventDefault();
        scrollBy(0, (e.key === "d" ? 1 : -1) * innerHeight / 2);
        place(nearest(links(pane)), false);
      }
      return;
    }

    const key = e.key;
    const seq = pending + key;
    pending = "";
    showcmd.textContent = "";

    switch (seq) {
      case "j": case "ArrowDown": step(1); break;
      case "k": case "ArrowUp": step(-1); break;
      case "h": case "ArrowLeft":
        if (pane === editor && visible(tree)) place(nearest(links(tree)));
        break;
      case "l": case "ArrowRight":
        if (pane === tree) place(nearest(links(editor)) || firstLinkOnScreen());
        break;
      case "Enter": case "o":
        if (cursor) { e.preventDefault(); follow(cursor); }
        break;
      case "gg": place(links(pane)[0]); scrollTo(0, 0); break;
      case "G": place(links(pane).at(-1)); scrollTo(0, document.documentElement.scrollHeight); break;
      case "gt": cycle(1); break;
      case "gT": cycle(-1); break;
      case "f": openBuffer("forj"); break;
      case "m": openBuffer("magnetite"); break;
      case ":": case ";": e.preventDefault(); openCmd(); return;
      case "Escape": echo(""); break;
      case "g":
        pending = "g";
        showcmd.textContent = "g";
        return;
      default: return;
    }
    e.preventDefault();
  });

  // clicks and Tab move the cursor too
  document.addEventListener("focusin", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (a && a !== cursor) place(a, false);
  });

  addEventListener("scroll", status, { passive: true });
  addEventListener("resize", status);

  place(links(editor)[0], false);
  status();
})();
