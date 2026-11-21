
      // Marca en el índice la sección que se está leyendo.
      (function () {
        if (!("IntersectionObserver" in window)) return;
        var links = {};
        document.querySelectorAll(".indice ol a").forEach(function (a) {
          links[a.getAttribute("href").slice(1)] = a;
        });
        var obs = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              if (!e.isIntersecting) return;
              Object.keys(links).forEach(function (id) { links[id].removeAttribute("aria-current"); });
              var a = links[e.target.id];
              if (a) a.setAttribute("aria-current", "true");
            });
          },
          { rootMargin: "-15% 0px -70% 0px" }
        );
        document.querySelectorAll("article section[id]").forEach(function (s) { obs.observe(s); });
        // En móvil el índice arranca plegado para no tapar el texto.
        if (window.matchMedia("(max-width: 860px)").matches) {
          var d = document.querySelector(".indice details");
          if (d) d.removeAttribute("open");
        }
      })();
    