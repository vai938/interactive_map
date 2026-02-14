export function notifySreenReader(text, view, priority) {
  var el = document.createElement("div");
  var id = "speak-" + Date.now();
  el.setAttribute("id", id);
  el.setAttribute("aria-live", priority || "polite");
  el.classList.add("visually-hidden");
  document.body.appendChild(el);
  let statusBar = document.getElementById("status-bar");
  if (view) {
    statusBar.innerText = text;
  }

  window.setTimeout(function () {
    document.getElementById(id).innerHTML = text;
  }, 1000);

  window.setTimeout(function () {
    document.body.removeChild(document.getElementById(id));
  }, 10000);
}

export function notifyLoading() {
  notifySreenReader("Loading.");
  // Add your logic here
}
window.notifySreenReader = notifySreenReader;
