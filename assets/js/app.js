const TIER_PONTOS = { "S+": 6, S: 5, A: 4, B: 3, C: 2, D: 1 };
const TIER_ORDEM = ["S+", "S", "A", "B", "C", "D"];
const FACCAO_LABEL = {
  automatons: "Robôs",
  terminids: "Insetos",
  illuminate: "Alienígenas",
};

const estado = {
  categoria: "primaria",
  faccao: "todas",
  busca: "",
  tipo: "",
  tier: "",
  soFacil: false,
};

function categoriaAtual() {
  return window.CATEGORIAS.find((item) => item.id === estado.categoria);
}

function itensAtivos() {
  if (estado.categoria === "primaria") return window.ARMAS;
  return window.ITENS[estado.categoria] || [];
}

function pontos(item) {
  return (
    TIER_PONTOS[item.tiers.automatons] +
    TIER_PONTOS[item.tiers.terminids] +
    TIER_PONTOS[item.tiers.illuminate]
  );
}

function overall(item) {
  if (item.rankUnico) return item.rankUnico;
  const media = pontos(item) / 3;
  if (media >= 5.5) return "S+";
  if (media >= 4.5) return "S";
  if (media >= 3.5) return "A";
  if (media >= 2.5) return "B";
  if (media >= 1.5) return "C";
  return "D";
}

function normalizarNome(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "");
}

function urlImagem(item) {
  const mapa = window.IMAGENS || {};
  const tentativas = [
    `${item.codigo} ${item.nome}`,
    item.nome,
    item.codigo,
    `${item.codigo}-${item.nome}`,
  ];
  for (const t of tentativas) {
    const chave = normalizarNome(t);
    if (mapa[chave]) return mapa[chave];
  }
  const nome = normalizarNome(item.nome);
  if (nome.length >= 5) {
    for (const [chave, src] of Object.entries(mapa)) {
      if (chave.includes(nome) || nome.includes(chave)) return src;
    }
  }
  return "";
}

function htmlFigura(item, classe) {
  const src = urlImagem(item);
  const letra = (item.nome || "?").slice(0, 1).toUpperCase();
  const alt = `Ícone de ${item.codigo} ${item.nome}`;
  if (!src) {
    return `<span class="${classe} ${classe}--vazia" aria-hidden="true">${letra}</span>`;
  }
  return `<img class="${classe}" src="${src}" alt="${alt}" width="96" height="96" loading="lazy" decoding="async" onerror="this.onerror=null;this.outerHTML='<span class=\\'${classe} ${classe}--vazia\\' aria-hidden=\\'true\\'>${letra}</span>'">`;
}

function tierCss(tier) {
  return `tier tier-${String(tier).replace("+", "plus")}`;
}

function escolhe(faccao, { facil = false } = {}) {
  const base = itensAtivos();
  const lista = facil ? base.filter((item) => item.facil) : base;
  const pool = lista.length ? lista : base;
  const rank = (item) => {
    if (faccao === "todas" || item.rankUnico) return pontos(item);
    return TIER_PONTOS[item.tiers[faccao]];
  };
  const pen = { nenhuma: 0, leve: 2, média: 3, pesada: 4, "anti-tanque": 5 };
  return [...pool].sort((a, b) => {
    const diff = rank(b) - rank(a);
    if (diff !== 0) return diff;
    if (a.facil !== b.facil) return a.facil ? -1 : 1;
    const dpsDiff = (b.dps || 0) - (a.dps || 0);
    if (dpsDiff !== 0) return dpsDiff;
    return (pen[b.penetracao] || 0) - (pen[a.penetracao] || 0);
  })[0];
}

function acharItem(id) {
  const primaria = window.ARMAS.find((item) => item.id === id);
  if (primaria) return { item: primaria, categoria: "primaria" };
  for (const [categoria, lista] of Object.entries(window.ITENS)) {
    const item = lista.find((entrada) => entrada.id === id);
    if (item) return { item, categoria };
  }
  return null;
}

function preencherMeta() {
  const cat = categoriaAtual();
  const n = itensAtivos().length;
  document.getElementById("titulo").textContent = `Helldivers 2 · ${cat.nomeLongo}`;
  document.getElementById("subtitulo").innerHTML =
    `${n} itens. Uma pergunta: <strong>${cat.pergunta}</strong>`;
  document.getElementById("lead").textContent = cat.lead;
  document.getElementById("label-busca").textContent = cat.filtroLabel;
  document.getElementById("meta-patch").textContent =
    `${n} ${cat.palavra}${n === 1 ? "" : "s"} · patch 6.3.1`;
  document.getElementById("link-fonte").href = cat.fonteUrl;
  document.title = `Dicas Games — ${cat.nomeLongo}`;
}

function preencherTipos() {
  const select = document.getElementById("filtro-tipo");
  const atual = estado.tipo;
  select.innerHTML = `<option value="">Todos</option>`;
  const tipos = [...new Set(itensAtivos().map((item) => item.tipo))].sort();
  tipos.forEach((tipo) => {
    const option = document.createElement("option");
    option.value = tipo;
    option.textContent = tipo;
    select.append(option);
  });
  estado.tipo = tipos.includes(atual) ? atual : "";
  select.value = estado.tipo;
}

function htmlInimigos(item, faccao) {
  const bloco = item.inimigos?.[faccao];
  if (!bloco) return "";
  return `
    <p><strong>${FACCAO_LABEL[faccao]} · ${item.tiers[faccao]}</strong></p>
    <p>Boa contra: ${bloco.bomContra.join(", ")}.</p>
    <p>Fraca contra: ${bloco.ruimContra.join(", ")}.</p>
  `;
}

function metaLinha(item) {
  const partes = [item.tipo];
  if (item.penetracao) partes.push(`penetração ${item.penetracao}`);
  if (item.origem) partes.push(item.origem);
  if (item.extraLabel) partes.push(item.extraLabel);
  return partes.join(" · ");
}

function htmlCarta(item) {
  const aberto = location.hash.replace("#", "") === item.id;
  const pills = item.rankUnico
    ? `<div class="pills"><span class="pill">Rank <span class="${tierCss(item.rankUnico)}">${item.rankUnico}</span></span></div>`
    : `<div class="pills">
        <span class="pill">🤖 <span class="${tierCss(item.tiers.automatons)}">${item.tiers.automatons}</span></span>
        <span class="pill">🐛 <span class="${tierCss(item.tiers.terminids)}">${item.tiers.terminids}</span></span>
        <span class="pill">👾 <span class="${tierCss(item.tiers.illuminate)}">${item.tiers.illuminate}</span></span>
      </div>`;
  const rodape = [
    item.dps ? `DPS de referência: ${item.dps}` : "",
    item.alcance && item.alcance !== "—" ? `alcance ${item.alcance}` : "",
    `dificuldade ${item.dificuldade}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <details class="carta" id="${item.id}" ${aberto ? "open" : ""}>
      <summary>
        <div class="carta__topo">
          ${htmlFigura(item, "carta__img")}
          <div>
            <p class="carta__codigo">${item.codigo}</p>
            <h3>${item.nome}</h3>
            <p class="carta__tipo">${metaLinha(item)}</p>
          </div>
          <span class="${tierCss(overall(item))}" title="Média nas três frentes">${overall(item)}</span>
        </div>
        ${pills}
        ${item.facil ? `<span class="selo-facil">Fácil de usar</span>` : ""}
        <p class="carta__resumo">${item.resumo}</p>
      </summary>
      <div class="detalhe">
        <p class="aviso">${item.dicaTda}</p>
        <p><strong>Quando usar:</strong> ${item.quandoUsar}</p>
        <p><strong>Quando evitar:</strong> ${item.quandoEvitar}</p>
        <p><strong>Como usar</strong></p>
        <ul>${item.comoUsar.map((linha) => `<li>${linha}</li>`).join("")}</ul>
        ${item.rankUnico ? "" : htmlInimigos(item, "automatons") + htmlInimigos(item, "terminids") + htmlInimigos(item, "illuminate")}
        <p>${rodape}.</p>
      </div>
    </details>
  `;
}

function filtra() {
  const termo = estado.busca.trim().toLowerCase();
  return itensAtivos().filter((item) => {
    if (estado.soFacil && !item.facil) return false;
    if (estado.tipo && item.tipo !== estado.tipo) return false;
    if (estado.tier) {
      const nota =
        estado.faccao === "todas" || item.rankUnico
          ? overall(item)
          : item.tiers[estado.faccao];
      if (nota !== estado.tier) return false;
    }
    if (!termo) return true;
    const blob = [
      item.nome,
      item.codigo,
      item.tipo,
      item.origem,
      item.resumo,
      item.dicaTda,
      item.quandoUsar,
      item.extraLabel,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(termo);
  });
}

function renderCats() {
  const nav = document.getElementById("cats");
  nav.innerHTML = window.CATEGORIAS.map(
    (cat) => `
      <button type="button" class="cat${cat.id === estado.categoria ? " is-on" : ""}" data-cat="${cat.id}" role="tab" aria-selected="${cat.id === estado.categoria}">
        <span aria-hidden="true">${cat.emoji}</span>
        ${cat.nome}
      </button>
    `
  ).join("");
}

function renderLista() {
  const lista = filtra();
  const grades = document.getElementById("grades");
  const contador = document.getElementById("contador");
  const cat = categoriaAtual();
  const frente =
    estado.faccao === "todas"
      ? "média nas três frentes"
      : `rank contra ${FACCAO_LABEL[estado.faccao].toLowerCase()}`;

  contador.textContent = `${lista.length} ${cat.palavra}${lista.length === 1 ? "" : "s"} · ordenadas por ${frente}`;

  if (!lista.length) {
    grades.innerHTML = `<p class="vazio">Nada encontrado. Limpe a busca ou os filtros.</p>`;
    return;
  }

  const grupos = {};
  TIER_ORDEM.forEach((tier) => {
    grupos[tier] = [];
  });
  lista.forEach((item) => {
    const nota =
      estado.faccao === "todas" || item.rankUnico
        ? overall(item)
        : item.tiers[estado.faccao];
    grupos[nota].push(item);
  });

  grades.innerHTML = TIER_ORDEM.map((tier) => {
    const itens = grupos[tier].sort((a, b) => pontos(b) - pontos(a));
    if (!itens.length) return "";
    return `
      <section class="grade">
        <div class="grade__titulo">
          <span class="${tierCss(tier)}">${tier}</span>
          <h2>${tier === "S+" ? "Os mais fortes" : tier === "D" ? "Evite estes" : `Rank ${tier}`}</h2>
          <span>${itens.length}</span>
        </div>
        <div class="cartas">${itens.map(htmlCarta).join("")}</div>
      </section>
    `;
  }).join("");
}

function renderDica() {
  const caixa = document.getElementById("dica-rapida");
  const faccao = estado.faccao;
  const info = window.FACCOES.find((item) => item.id === faccao);
  const melhor = escolhe(faccao);
  const facil = escolhe(faccao, { facil: true });
  if (!melhor) return;
  const mesma = melhor.id === facil.id;
  const cat = categoriaAtual();

  document.querySelectorAll(".escolha").forEach((botao) => {
    botao.classList.toggle("is-on", botao.dataset.faccao === faccao);
  });

  if (faccao === "todas") {
    caixa.hidden = false;
    caixa.innerHTML = `
      <h3>Se você não sabe contra quem vai</h3>
      <p>Leve um ${cat.palavra} que funciona nas três frentes.</p>
      <div class="recs">
        <article class="rec">
          ${htmlFigura(melhor, "rec__img")}
          <div>
            <span class="tag">Mais forte</span>
            <strong>${melhor.codigo} ${melhor.nome}</strong>
            <p>${melhor.resumo}</p>
            <p><a href="#${melhor.id}">Ver detalhes</a></p>
          </div>
        </article>
        <article class="rec">
          ${htmlFigura(facil, "rec__img")}
          <div>
            <span class="tag">Mais fácil</span>
            <strong>${facil.codigo} ${facil.nome}</strong>
            <p>${facil.dicaTda}</p>
            <p><a href="#${facil.id}">Ver detalhes</a></p>
          </div>
        </article>
      </div>
    `;
    return;
  }

  caixa.hidden = false;
  caixa.innerHTML = `
    <h3>${info.emoji} ${info.nome} · ${info.nomeJogo}</h3>
    <p>${info.resumo}</p>
    <p><strong>Dica:</strong> ${info.dica}</p>
    <div class="recs">
      <article class="rec">
        ${htmlFigura(melhor, "rec__img")}
        <div>
          <span class="tag">Mais forte nesta frente</span>
          <strong>${melhor.codigo} ${melhor.nome} · ${melhor.tiers[faccao]}</strong>
          <p>${melhor.resumo}</p>
          <p><a href="#${melhor.id}">Ver detalhes</a></p>
        </div>
      </article>
      <article class="rec">
        ${htmlFigura(facil, "rec__img")}
        <div>
          <span class="tag">${mesma ? "Também é fácil" : "Mais fácil nesta frente"}</span>
          <strong>${facil.codigo} ${facil.nome} · ${facil.tiers[faccao]}</strong>
          <p>${facil.dicaTda}</p>
          <p><a href="#${facil.id}">Ver detalhes</a></p>
        </div>
      </article>
    </div>
  `;
}

function escreverUrl() {
  const url = new URL(location.href);
  url.searchParams.set("cat", estado.categoria);
  if (estado.faccao && estado.faccao !== "todas") {
    url.searchParams.set("faccao", estado.faccao);
  } else {
    url.searchParams.delete("faccao");
  }
  history.replaceState(null, "", url);
}

function lerUrl() {
  const url = new URL(location.href);
  const cat = url.searchParams.get("cat");
  const faccao = url.searchParams.get("faccao");
  if (cat && window.CATEGORIAS.some((item) => item.id === cat)) {
    estado.categoria = cat;
  }
  if (faccao && (faccao === "todas" || FACCAO_LABEL[faccao])) {
    estado.faccao = faccao;
  }
}

function aplicar() {
  preencherMeta();
  preencherTipos();
  renderCats();
  renderDica();
  renderLista();
  escreverUrl();
}

function trocarCategoria(id) {
  estado.categoria = id;
  estado.tipo = "";
  estado.busca = "";
  document.getElementById("busca").value = "";
  document.getElementById("filtro-facil").checked = false;
  estado.soFacil = false;
  aplicar();
}

function ligarEventos() {
  document.getElementById("cats").addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-cat]");
    if (!botao) return;
    trocarCategoria(botao.dataset.cat);
  });

  document.querySelectorAll(".escolha").forEach((botao) => {
    botao.addEventListener("click", () => {
      estado.faccao = botao.dataset.faccao;
      renderDica();
      renderLista();
      escreverUrl();
    });
  });

  const busca = document.getElementById("busca");
  let timer = 0;
  busca.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      estado.busca = busca.value;
      renderLista();
    }, 150);
  });

  document.getElementById("filtro-tipo").addEventListener("change", (evento) => {
    estado.tipo = evento.target.value;
    renderLista();
  });
  document.getElementById("filtro-tier").addEventListener("change", (evento) => {
    estado.tier = evento.target.value;
    renderLista();
  });
  document.getElementById("filtro-facil").addEventListener("change", (evento) => {
    estado.soFacil = evento.target.checked;
    renderLista();
  });

  const foco = document.getElementById("btn-foco");
  foco.addEventListener("click", () => {
    const ligado = document.body.classList.toggle("modo-foco");
    foco.setAttribute("aria-pressed", String(ligado));
    foco.textContent = ligado ? "Sair do modo foco" : "Modo foco";
  });
}

function abrirHash() {
  const hash = location.hash.replace("#", "");
  if (!hash) return;
  const encontrado = acharItem(hash);
  if (!encontrado) return;
  if (encontrado.categoria !== estado.categoria) {
    estado.categoria = encontrado.categoria;
    aplicar();
  }
  const carta = document.getElementById(encontrado.item.id);
  if (!carta) return;
  carta.open = true;
  carta.scrollIntoView({ block: "center" });
}

document.addEventListener("DOMContentLoaded", () => {
  lerUrl();
  ligarEventos();
  aplicar();
  abrirHash();
});

window.addEventListener("hashchange", abrirHash);
