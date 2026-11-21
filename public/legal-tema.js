
      // Mismo tema que eligió la persona en la app; si nunca eligió, manda el sistema.
      try {
        var t = localStorage.getItem("novaia_theme");
        if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
      } catch (e) {}
    