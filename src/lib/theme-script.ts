export const THEME_BOOTSTRAP = `(function(){
  try {
    if (location.pathname.indexOf("/obs") === 0) {
      document.documentElement.setAttribute("data-obs", "");
      return;
    }
    var stored = localStorage.getItem("bunvi-theme");
    var dark = stored === "dark" || ((stored !== "light") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();`;
