const LONG_JS = `
function unusedHelper(count) {
  var total = 0;
  for (var i = 0; i < count; i++) {
    total += i;
  }
  return total;
}
console.log("fixture script", unusedHelper(5));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpeHR1cmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiJ9
`;

const LONG_CSS = `
@import url("/fixture/imported.css");

body {
  font-family: Georgia, serif;
  background: #ffffff;
  color: #222222;
}

.hero {
  padding: 48px;
  margin: 24px;
  border: 1px dashed #cccccc;
}
`;

function page({ title, h1s, description, extra = "", path = "/fixture" }) {
  const h1Html = h1s.map((h) => `<h1>${h}</h1>`).join("\n");
  const desc = description
    ? `<meta name="description" content="${description}" />`
    : "";
  return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  ${desc}
  <link rel="stylesheet" href="/fixture/style.css" />
  <script src="/fixture/script.js"></script>
  <style>
    .inline { color: red; padding: 10px; margin: 10px; }
  </style>
</head>
<body>
  ${h1Html}
  <p class="hero">This local fixture is intentionally messy so Site Audit can report SEO, speed, and security issues without touching the public internet.</p>
  <p>Thin on purpose. <a href="/fixture/about">About</a> <a href="/fixture/bad_page">Underscore</a> <a href="/fixture/missing">Broken internal</a> <a href="/fixture/soft-404">Soft 404</a></p>
  <img src="/fixture/no-alt.png" />
  <embed src="/fixture/plugin.swf" />
  <form method="get" action="/fixture/login">
    <input type="password" name="pw" />
    <button>Go</button>
  </form>
  <script>
    window.fixtureInline = true;
    console.log("inline");
  </script>
  ${extra}
</body>
</html>`;
}

export function mountFixture(app) {
  app.get("/fixture", (_req, res) => {
    res.type("html").send(
      page({
        title: "Hi",
        h1s: ["Welcome", "Also welcome"],
        description: ""
      })
    );
  });

  app.get("/fixture/about", (_req, res) => {
    res.type("html").send(
      page({
        title: "Hi",
        h1s: ["Welcome"],
        description: "Short",
        extra: `<p>${"Filler words for uniqueness. ".repeat(20)}</p><meta http-equiv="refresh" content="5;url=/fixture" />`
      })
    );
  });

  app.get("/fixture/bad_page", (_req, res) => {
    res.type("html").send(
      page({
        title: "Bad underscore URL",
        h1s: ["Bad page"],
        description: "This path uses an underscore which should fail the URL names check."
      })
    );
  });

  app.get("/fixture/soft-404", (_req, res) => {
    res.status(200).type("html").send("<!DOCTYPE html><html><head><title>Not found</title></head><body><h1>Not found</h1><p>This page pretends to be missing but returns 200.</p></body></html>");
  });

  app.get("/fixture/style.css", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.type("css").send(LONG_CSS);
  });

  app.get("/fixture/imported.css", (_req, res) => {
    res.type("css").send("/* imported */\nbody { outline: 1px solid red; }\n");
  });

  app.get("/fixture/script.js", (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.type("js").send(LONG_JS);
  });

  app.get("/fixture/no-alt.png", (_req, res) => {
    res.status(404).type("text").send("missing image");
  });

  app.get("/fixture/login", (_req, res) => {
    res.type("html").send("<!DOCTYPE html><html><head><title>Login</title></head><body><h1>Login</h1></body></html>");
  });
}
