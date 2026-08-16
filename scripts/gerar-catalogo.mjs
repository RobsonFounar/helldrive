import fs from "node:fs";

const TIER_PONTOS = { "S+": 6, S: 5, A: 4, B: 3, C: 2, D: 1 };
const FACCOES = ["automatons", "terminids", "illuminate"];
const ALVOS = {
  automatons: {
    mole: ["Soldados"],
    medio: ["Devastators", "Scout Striders"],
    pesado: ["Hulks", "Tanques"],
    objetivo: ["Fabricadores"],
  },
  terminids: {
    mole: ["Catadores", "Caçadores"],
    medio: ["Guerreiros", "Spewers"],
    pesado: ["Chargers", "Titãs de Bile"],
    objetivo: ["Ninhos"],
  },
  illuminate: {
    mole: ["Voteless"],
    medio: ["Overseers", "Fleshmobs"],
    pesado: ["Harvesters"],
    objetivo: ["Naves no chão"],
  },
};

function slug(codigo, nome) {
  return `${codigo}-${nome}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function overall(tiers) {
  const media =
    (TIER_PONTOS[tiers.automatons] +
      TIER_PONTOS[tiers.terminids] +
      TIER_PONTOS[tiers.illuminate]) /
    3;
  if (media >= 5.5) return "S+";
  if (media >= 4.5) return "S";
  if (media >= 3.5) return "A";
  if (media >= 2.5) return "B";
  if (media >= 1.5) return "C";
  return "D";
}

function melhorFrente(tiers) {
  return [...FACCOES].sort(
    (a, b) => TIER_PONTOS[tiers[b]] - TIER_PONTOS[tiers[a]]
  )[0];
}

function piorFrente(tiers) {
  return [...FACCOES].sort(
    (a, b) => TIER_PONTOS[tiers[a]] - TIER_PONTOS[tiers[b]]
  )[0];
}

const NOME_FRENTE = {
  automatons: "robôs",
  terminids: "insetos",
  illuminate: "alienígenas",
};

function inimigos(tiers) {
  const out = {};
  for (const f of FACCOES) {
    const n = TIER_PONTOS[tiers[f]];
    const a = ALVOS[f];
    if (n >= 5) {
      out[f] = {
        bomContra: [...a.mole, ...a.medio, a.objetivo[0]],
        ruimContra: n >= 6 ? ["Quase nada nesta frente"] : a.pesado,
      };
    } else if (n >= 4) {
      out[f] = { bomContra: [...a.mole, ...a.medio], ruimContra: a.pesado };
    } else if (n >= 3) {
      out[f] = { bomContra: a.mole, ruimContra: [...a.medio, ...a.pesado] };
    } else {
      out[f] = {
        bomContra: ["Quase nada nesta frente"],
        ruimContra: [...a.mole, ...a.medio, ...a.pesado],
      };
    }
  }
  return out;
}

function montar(item, cat) {
  const id = slug(item.codigo, item.nome);
  const tiers = item.rankUnico
    ? {
        automatons: item.rankUnico,
        terminids: item.rankUnico,
        illuminate: item.rankUnico,
      }
    : item.tiers;
  const ov = overall(tiers);
  const best = melhorFrente(tiers);
  const worst = piorFrente(tiers);
  const facil = item.facil !== false && ["S+", "S", "A", "B"].includes(ov)
    ? item.facil !== false && (item.facil === true || cat.facilPadrao)
    : Boolean(item.facil);
  const extra = item.extra || {};

  const resumo =
    extra.resumo ||
    (item.rankUnico
      ? `${item.nome} está no rank ${item.rankUnico} desta categoria.`
      : `${item.nome} é ${ov} no geral. Melhor contra ${NOME_FRENTE[best]} (${tiers[best]}).`);

  const dicaTda =
    extra.dicaTda ||
    (facil
      ? "Uso direto: equipe e siga. Pouca decisão no meio da luta."
      : "Pede um pouco de atenção. Teste em dificuldade baixa antes da missão séria.");

  const quandoUsar =
    extra.quandoUsar ||
    (item.rankUnico
      ? `Quando você quer o que este ${cat.palavra} oferece no rank ${item.rankUnico}.`
      : `Principalmente contra ${NOME_FRENTE[best]}.`);

  const quandoEvitar =
    extra.quandoEvitar ||
    (TIER_PONTOS[tiers[worst]] <= 2
      ? `Evite contra ${NOME_FRENTE[worst]}. O rank ${tiers[worst]} avisa.`
      : "Troque se o time já cobriu este papel.");

  const comoUsar =
    extra.comoUsar ||
    cat.comoUsarPadrao(item, { best, worst, tiers });

  return {
    id,
    codigo: item.codigo,
    nome: item.nome,
    tipo: item.tipo,
    origem: item.origem,
    dps: item.dps ?? null,
    penetracao: item.penetracao || "",
    extraLabel: item.extraLabel || "",
    facil,
    dificuldade: facil ? "fácil" : item.dificuldade || "média",
    alcance: item.alcance || cat.alcancePadrao,
    rankUnico: item.rankUnico || null,
    tiers,
    resumo,
    dicaTda,
    quandoUsar,
    quandoEvitar,
    comoUsar,
    inimigos: extra.inimigos || inimigos(tiers),
  };
}

const categorias = [
  {
    id: "primaria",
    nome: "Primária",
    nomeLongo: "Armas primárias",
    emoji: "🔫",
    pergunta: "contra quem você vai lutar?",
    lead: "A arma que você segura o tempo todo. Toque em uma frente.",
    fonteUrl:
      "https://u.gg/hd2/tier-list/helldivers-2-primary-weapons-tier-list",
    palavra: "arma",
    filtroLabel: "Buscar arma",
    alcancePadrao: "médio",
    facilPadrao: false,
  },
  {
    id: "secundaria",
    nome: "Secundária",
    nomeLongo: "Armas secundárias",
    emoji: "🔫",
    pergunta: "qual pistola ou ferramenta de emergência?",
    lead: "A arma da coldre. Serve quando a primária acaba ou para um trabalho específico (buraco, cura, tanque).",
    fonteUrl:
      "https://u.gg/hd2/tier-list/helldivers-2-secondary-weapons-tier-list",
    palavra: "secundária",
    filtroLabel: "Buscar secundária",
    alcancePadrao: "curto",
    facilPadrao: true,
    comoUsarPadrao: (item) => [
      "Troque para ela quando a primária recarrega ou acaba.",
      item.penetracao === "anti-tanque"
        ? "Guarde o tiro para o bicho pesado ou o objetivo."
        : "Use de perto. Não dispute distância com rifle.",
      "Recarregue sempre que o combate pausar.",
    ],
  },
  {
    id: "suporte",
    nome: "Suporte",
    nomeLongo: "Armas de suporte",
    emoji: "🎯",
    pergunta: "quem mata o bicho grande?",
    lead: "Você chama do céu. É a arma pesada da missão. Combinar com a primária: uma limpa o chão, a outra fura o tanque.",
    fonteUrl: "https://u.gg/hd2/tier-list/support-weapon-stratagem-tier-list",
    palavra: "suporte",
    filtroLabel: "Buscar suporte",
    alcancePadrao: "médio",
    facilPadrao: false,
    comoUsarPadrao: () => [
      "Chame no começo da missão, não no meio do pânico.",
      "Se pedir mochila, um amigo recarrega mais rápido.",
      "Não gaste o pente inteiro no bicho mole.",
    ],
  },
  {
    id: "arremessavel",
    nome: "Granada",
    nomeLongo: "Arremessáveis",
    emoji: "💣",
    pergunta: "o que você joga com a mão?",
    lead: "Granada, mina, termite. Fecha ninho, para o grupo ou apaga o pesado. Leve poucas, acerte o momento.",
    fonteUrl: "https://u.gg/hd2/tier-list/helldivers-2-throwables-tier-list",
    palavra: "granada",
    filtroLabel: "Buscar granada",
    alcancePadrao: "médio",
    facilPadrao: true,
    comoUsarPadrao: (item) => [
      Number(item.extraLabel?.match(/\d+/)?.[0] || 20) >= 20
        ? "Se o poder de demolição for 20+, jogue no buraco/fábrica."
        : "Não fecha ninho. Use para controlar o grupo.",
      "Não jogue nos pés do time.",
      "Recolha no ressuprimento. O estoque acaba rápido.",
    ],
  },
  {
    id: "mochila",
    nome: "Mochila",
    nomeLongo: "Mochilas",
    emoji: "🎒",
    pergunta: "escudo, pulo, munição ou cão de guarda?",
    lead: "Ocupa as costas. Se a arma de suporte já usa mochila, você não leva esta. Escolha: sobreviver, correr ou atirar mais.",
    fonteUrl:
      "https://u.gg/hd2/tier-list/helldivers-2-backpack-stratagem-tier-list",
    palavra: "mochila",
    filtroLabel: "Buscar mochila",
    alcancePadrao: "—",
    facilPadrao: true,
    comoUsarPadrao: () => [
      "Chame cedo. Sem mochila você fica exposto.",
      "Não combine com suporte que já exige mochila, a menos que o time carregue a munição.",
      "Olhe o indicador (escudo, calor, pulo) o tempo todo.",
    ],
  },
  {
    id: "eagle",
    nome: "Eagle",
    nomeLongo: "Ataques Eagle",
    emoji: "✈️",
    pergunta: "qual bomba o avião solta?",
    lead: "O avião passa rápido. Tem cargas limitadas e depois rearma. Marque o chão, saia da área, não marque o time.",
    fonteUrl: "https://u.gg/hd2/tier-list/eagle-stratagem-tier-list",
    palavra: "Eagle",
    filtroLabel: "Buscar Eagle",
    alcancePadrao: "área",
    facilPadrao: false,
    comoUsarPadrao: () => [
      "Jogue o marcador no grupo ou no objetivo, não nos seus pés.",
      "Saia da zona. Atraso do avião mata desatento.",
      "Rearme quando a luta acalmar, não no meio do extract.",
    ],
  },
  {
    id: "sentinela",
    nome: "Sentinela",
    nomeLongo: "Sentinelas e emplacements",
    emoji: "🗼",
    pergunta: "o que fica atirando por você?",
    lead: "Torre, mina ou ninho de metralhadora. Coloque onde o inimigo passa. Algumas matam o time se ficarem atrás de vocês.",
    fonteUrl: "https://u.gg/hd2/tier-list/sentry-stratagem-tier-list",
    palavra: "sentinela",
    filtroLabel: "Buscar sentinela",
    alcancePadrao: "área",
    facilPadrao: false,
    comoUsarPadrao: (item) => [
      /Mortar|Tesla|Mina|Mine/i.test(item.nome)
        ? "Longe do time. Estas matam amigo com facilidade."
        : "Coloque olhando a trilha por onde o inimigo vem.",
      "Não coloque no meio do extract sem avisar.",
      "Se destruírem, chame de novo num canto novo.",
    ],
  },
  {
    id: "booster",
    nome: "Booster",
    nomeLongo: "Boosters",
    emoji: "⚡",
    pergunta: "qual bônus o esquadrão inteiro ganha?",
    lead: "Um por jogador, vale para todo o time. Não precisa apertar nada na missão. Escolha antes de entrar na cápsula.",
    fonteUrl: "https://u.gg/hd2/tier-list/booster-tier-list",
    palavra: "booster",
    filtroLabel: "Buscar booster",
    alcancePadrao: "—",
    facilPadrao: true,
    comoUsarPadrao: () => [
      "Equipe na nave, antes do drop.",
      "Não leve dois iguais no time. Combine.",
      "Se ninguém pegou Stamina ou Vitality, pegue um deles.",
    ],
  },
  {
    id: "armadura",
    nome: "Armadura",
    nomeLongo: "Passivas de armadura",
    emoji: "🛡️",
    pergunta: "qual efeito a roupa te dá?",
    lead: "O visual importa pouco. A passiva importa. Leve, média ou pesada muda velocidade e dano recebido. A passiva muda o jeito de jogar.",
    fonteUrl: "https://u.gg/hd2/tier-list/armor-passive-tier-list",
    palavra: "passiva",
    filtroLabel: "Buscar passiva",
    alcancePadrao: "—",
    facilPadrao: true,
    comoUsarPadrao: () => [
      "Leve: corre mais, morre mais fácil. Boa contra inseto que persegue.",
      "Pesada: anda devagar, aguenta tiro. Boa contra robô.",
      "Média: se você não sabe o que vem, comece aqui.",
    ],
  },
  {
    id: "warbond",
    nome: "Warbond",
    nomeLongo: "Warbonds",
    emoji: "📒",
    pergunta: "qual passe vale a pena comprar?",
    lead: "É a loja de desbloqueio. Democratic Detonation costuma ser o melhor primeiro gasto: Eruptor, besta e pistola-granada.",
    fonteUrl: "https://u.gg/hd2/tier-list/warbond-tier-list",
    palavra: "warbond",
    filtroLabel: "Buscar warbond",
    alcancePadrao: "—",
    facilPadrao: true,
    comoUsarPadrao: () => [
      "Gaste Super Credits no S+ primeiro.",
      "Não compre crossover (Halo/Killzone) pensando em meta.",
      "Medalhas desbloqueiam página a página. Priorize a arma S.",
    ],
  },
  {
    id: "orbital",
    nome: "Orbital",
    nomeLongo: "Ataques orbitais",
    emoji: "🛰️",
    pergunta: "qual tiro vem da nave?",
    lead: "A Super Destroyer atira do céu. Recarga longa. Laser e Precision são os mais seguros para quem está começando.",
    fonteUrl: "https://u.gg/hd2/tier-list/orbital-stratagem-tier-list",
    palavra: "orbital",
    filtroLabel: "Buscar orbital",
    alcancePadrao: "área",
    facilPadrao: false,
    comoUsarPadrao: () => [
      "Marque o alvo grande ou o ninho, não o Caçador no seu pé.",
      "Olhe o tempo de recarga. Laser demora 5 minutos.",
      "Afastem-se. Barragem não escolhe uniforme.",
    ],
  },
  {
    id: "veiculo",
    nome: "Veículo",
    nomeLongo: "Veículos e exosuits",
    emoji: "🚗",
    pergunta: "carro, tanque ou robô de combate?",
    lead: "Chama uma máquina. FRV é o jipe. Exosuit é o mecha. Demora para recarregar. Não abandone o time para passear.",
    fonteUrl: "https://u.gg/hd2/tier-list/helldivers-2-vehicle-tier-list",
    palavra: "veículo",
    filtroLabel: "Buscar veículo",
    alcancePadrao: "—",
    facilPadrao: false,
    comoUsarPadrao: () => [
      "Chame em lugar aberto. Árvore e teto travam o drop.",
      "Jipe: alguém dirige, alguém atira.",
      "Exosuit: você fica lento e alto. Saia antes de explodir em cima do time.",
    ],
  },
];

const DADOS = {
  secundaria: [
    ["LAS-58", "Talon", "Pistola laser", "Borderline Justice", "média", { automatons: "S", terminids: "S", illuminate: "S+" }, true, { resumo: "Pistola de laser que não gasta pente comum. A melhor secundária geral contra alienígenas.", dicaTda: "Aponte e segure. Sem recarregar pente. Solte se esquentar.", quandoUsar: "Qualquer loadout que precise de uma pistola confiável nas três frentes.", quandoEvitar: "Se você precisa fechar ninho: pegue a pistola-granada." }],
    ["PLAS-15", "Loyalist", "Pistola plasma", "Truth Enforcers", "média", { automatons: "A", terminids: "S", illuminate: "S+" }, true, { resumo: "Plasma de coldre. Explode um pouco e ajuda contra escudo alienígena." }],
    ["GP-31", "Grenade Pistol", "Pistola-granada", "Democratic Detonation", "média", { automatons: "S", terminids: "S+", illuminate: "S+" }, true, { resumo: "Fecha buraco de inseto e fábrica de robô sem gastar estratagema. A secundária mais útil do jogo.", dicaTda: "Um tiro no buraco. Não atire no bicho colado em você.", quandoUsar: "Quase sempre. Objetivos importam mais que kill count.", quandoEvitar: "Se o Eruptor/besta já fecha objetivo e você quer pistola de pânico." }],
    ["P-72", "Crisper", "Pistola lança-chamas", "Freedom’s Flame", "pesada", { automatons: "B", terminids: "A", illuminate: "S+" }, false, { resumo: "Fogo na palma da mão. Derrete Voteless. Péssima ideia contra robô de longe." }],
    ["P-35", "Re-Educator", "Pistola pesada", "Redacted Regiment", "pesada", { automatons: "A", terminids: "S", illuminate: "S" }, false],
    ["P-92", "Warrant", "Pistola", "Superstore", "média", { automatons: "B", terminids: "A", illuminate: "S" }, true],
    ["P-113", "Verdict", "Pistola", "Polar Patriots", "média", { automatons: "A", terminids: "A", illuminate: "A" }, true, { resumo: "Pistola reta e honesta. Serve nas três frentes sem brilhar." }],
    ["P-69", "Veto", "Pistola", "Entrenched Division", "média", { automatons: "A", terminids: "A", illuminate: "A" }, true],
    ["P-4", "Senator", "Revólver pesado", "Steeled Veterans", "pesada", { automatons: "S+", terminids: "S", illuminate: "A" }, false, { resumo: "Revólver que fura. Cabeça de Devastator cai. Pouca bala, cada tiro conta.", dicaTda: "Mire com calma. Não spam. Se tremer a mão, use Redeemer.", quandoUsar: "Robôs. Precisão de coldre.", quandoEvitar: "Enxame colado. Seis tiros não limpam a onda." }],
    ["GP-20", "Ultimatum", "Pistola anti-tanque", "Servants of Freedom", "anti-tanque", { automatons: "S+", terminids: "S+", illuminate: "A" }, false, { resumo: "Um foguete no coldre. Apaga Charger e Hulk. Recarga cruel.", dicaTda: "Guarde para o bicho grande. Gastar no Catador é jogar o ás fora.", quandoUsar: "Quando o suporte anti-tanque está em recarga.", quandoEvitar: "Illuminate pesado e spam de mole." }],
    ["P-19", "Redeemer", "Pistola automática", "Helldivers Mobilize", "leve", { automatons: "B", terminids: "A", illuminate: "A" }, true, { resumo: "A pistola de pânico grátis. Spray perto. Não fura armadura.", dicaTda: "Aperte quando algo pular na sua cara. Recarrega rápido." }],
    ["P-11", "Stim Pistol", "Pistola de cura", "Chemical Agents", "nenhuma", { automatons: "A", terminids: "A", illuminate: "A" }, true, { resumo: "Não mata. Cura aliado. Você vira médico de campo.", dicaTda: "Só faz sentido se você lembra de atirar no amigo, não no inimigo.", quandoUsar: "Time organizado que cai muito.", quandoEvitar: "Solo ou se ninguém pede cura." }],
    ["M6C", "SOCOM", "Pistola Halo", "Halo: ODST", "leve", { automatons: "B", terminids: "B", illuminate: "B" }, true],
    ["CQC-2", "Saber", "Espada", "Masters of Ceremony", "média", { automatons: "C", terminids: "B", illuminate: "B" }, false, { resumo: "Corpo a corpo. Bonita. Perigosa. O jogo atira de volta." }],
    ["CQC-5", "Combat Hatchet", "Machadinha", "Superstore", "média", { automatons: "C", terminids: "B", illuminate: "B" }, false],
    ["CQC-42", "Machete", "Facão", "Superstore", "média", { automatons: "B", terminids: "B", illuminate: "B" }, false],
    ["LAS-7", "Dagger", "Pistola laser", "Cutting Edge", "leve", { automatons: "C", terminids: "C", illuminate: "B" }, true, { resumo: "Laser fraquinho. A Talon faz o mesmo trabalho melhor." }],
    ["P-33", "Missile Pistol", "Pistola-míssil", "Exo Experts", "anti-tanque", { automatons: "A", terminids: "A", illuminate: "B" }, false, { resumo: "Míssil de bolso. Menos brutal que o Ultimatum, ainda fura." }],
    ["SG-22", "Bushwhacker", "Espingarda de coldre", "Viper Commandos", "leve", { automatons: "C", terminids: "B", illuminate: "C" }, true],
    ["P-2", "Peacemaker", "Pistola inicial", "Arma inicial", "leve", { automatons: "D", terminids: "C", illuminate: "C" }, true, { resumo: "A pistola com que você nasce. Troque no primeiro desbloqueio.", quandoEvitar: "Qualquer momento depois da Redeemer." }],
    ["CQC-19", "Stun Lance", "Lança de atordoar", "Urban Legends", "média", { automatons: "D", terminids: "C", illuminate: "C" }, false],
    ["CQC-30", "Stun Baton", "Cassetete", "Superstore", "média", { automatons: "D", terminids: "C", illuminate: "C" }, false],
    ["CQC-73", "Entrenchment Tool", "Pá", "Entrenched Division", "média", { automatons: "D", terminids: "C", illuminate: "C" }, false, { resumo: "É uma pá. Meme. Não leve a sério." }],
  ],
  suporte: [
    ["RL-77", "Airburst Rocket Launcher", "Foguete de área", "Patriotic Administration Center", "média", { automatons: "A", terminids: "B", illuminate: "S+" }, false, { resumo: "Explode no ar. Limpa Voteless e grupo. Cuidado com o teto e o time." }],
    ["M-105", "Stalwart", "Metralhadora leve", "Patriotic Administration Center", "leve", { automatons: "B", terminids: "A", illuminate: "S+" }, true, { resumo: "Metralhadora que você recarrega andando. Enxame mole. Não fura tanque.", dicaTda: "Segure o gatilho no grupo. Troque se aparecer Hulk." }],
    ["FLAM-40", "Flamethrower", "Lança-chamas", "Patriotic Administration Center", "pesada", { automatons: "B", terminids: "S", illuminate: "S+" }, false, { resumo: "Fogo pesado. Inseto e Voteless derretem. Robô atira enquanto você aproxima." }],
    ["AC-8", "Autocannon", "Canhão automático", "Patriotic Administration Center", "pesada", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { resumo: "A arma de suporte mais segura nas três frentes. Média/pesada, objetivos, grupo.", dicaTda: "A escolha padrão. Recarga com mochila: peça ajuda ou recarregue atrás de capa.", quandoUsar: "Se você não sabe o que levar. Serve em tudo.", quandoEvitar: "Só se o time já tem três Autocannons e falta anti-tanque puro." }],
    ["StA-X3", "W.A.S.P. Launcher", "Mísseis em leque", "Patriotic Administration Center", "média", { automatons: "B", terminids: "B", illuminate: "S+" }, false],
    ["B/FLAM-80", "Cremator", "Lança-chamas de mochila", "Entrenched Division", "pesada", { automatons: "A", terminids: "S+", illuminate: "S+" }, false, { resumo: "Lança-chamas com tanque nas costas. Mais fôlego que o FLAM-40. Inseto e alienígena." }],
    ["MGX-42", "Bullet Storm", "Metralhadora", "Exo Experts", "leve", { automatons: "B", terminids: "A", illuminate: "S+" }, true],
    ["S-11", "Speargun", "Lança-arpão", "Dust Devils", "anti-tanque", { automatons: "S", terminids: "S", illuminate: "S" }, false, { resumo: "Arpão anti-tanque. Um tiro pesado nas três frentes." }],
    ["GL-21", "Grenade Launcher", "Lança-granadas", "Patriotic Administration Center", "média", { automatons: "S", terminids: "S", illuminate: "S" }, true, { resumo: "Granadas em série. Ninho, grupo, sem mochila. Clássico e fácil de entender.", dicaTda: "Atire no chão no meio do grupo, não na cara de quem está colado." }],
    ["MG-43", "Machine Gun", "Metralhadora", "Patriotic Administration Center", "média", { automatons: "B", terminids: "B", illuminate: "S" }, true],
    ["EAT-700", "Expendable Napalm", "Napalm descartável", "Dust Devils", "anti-tanque", { automatons: "B", terminids: "S", illuminate: "S" }, true],
    ["B/MD", "C4 Pack", "Pacote C4", "Redacted Regiment", "anti-tanque", { automatons: "S+", terminids: "S", illuminate: "A" }, false, { resumo: "Bombas cola. Ótimo em fábrica e stealth. Ocupa o slot de suporte.", dicaTda: "Cola, afasta, detona. Não fique na explosão." }],
    ["EAT-411", "Leveller", "Anti-tanque descartável", "Siege Breakers", "anti-tanque", { automatons: "S+", terminids: "B", illuminate: "A" }, true],
    ["MS-11", "Solo Silo", "Míssil solo", "Dust Devils", "anti-tanque", { automatons: "S", terminids: "S", illuminate: "A" }, false],
    ["CQC-20", "Breaching Hammer", "Marreta", "Siege Breakers", "anti-tanque", { automatons: "S", terminids: "S", illuminate: "A" }, false, { resumo: "Marreta que fura. Corpo a corpo pesado. Só se você gosta de chegar perto." }],
    ["ARC-3", "Arc Thrower", "Arco elétrico", "Patriotic Administration Center", "anti-tanque", { automatons: "C", terminids: "A", illuminate: "A" }, false, { resumo: "Raio que pula. Inseto agradece. Time não, se estiver na frente." }],
    ["GL-52", "De-Escalator", "Lança-granadas", "Force of Law", "pesada", { automatons: "B", terminids: "A", illuminate: "A" }, false],
    ["M-1000", "Maxigun", "Metralhadora pesada", "Python Commandos", "média", { automatons: "B", terminids: "B", illuminate: "A" }, false],
    ["GL-28", "Belt-Fed Grenade Launcher", "Lança-granadas contínuo", "Siege Breakers", "pesada", { automatons: "A", terminids: "A", illuminate: "A" }, false],
    ["MLS-4X", "Commando", "Mísseis guiados", "Patriotic Administration Center", "anti-tanque", { automatons: "S", terminids: "B", illuminate: "B" }, false, { resumo: "Quatro mísseis. Ótimo em robô. Fraco em enxame." }],
    ["PLAS-45", "Epoch", "Canhão plasma", "Control Group", "anti-tanque", { automatons: "S", terminids: "A", illuminate: "B" }, false],
    ["MG-206", "Heavy Machine Gun", "Metralhadora pesada", "Patriotic Administration Center", "pesada", { automatons: "B", terminids: "B", illuminate: "B" }, false],
    ["LAS-98", "Laser Cannon", "Canhão laser", "Patriotic Administration Center", "pesada", { automatons: "B", terminids: "B", illuminate: "B" }, true, { resumo: "Raio contínuo, sem pente. Honesto, hoje no meio da tabela." }],
    ["GR-8", "Recoilless Rifle", "Canhão sem recuo", "Patriotic Administration Center", "anti-tanque", { automatons: "S+", terminids: "S+", illuminate: "C" }, false, { resumo: "O matador de tanque clássico. Inseto e robô. Illuminate rende pouco.", dicaTda: "Um amigo recarrega. Sozinho você fica parado e vulnerável.", quandoUsar: "Chargers, Hulks, Titãs, tanques.", quandoEvitar: "Missão Illuminate se o time precisa de área." }],
    ["APW-1", "Anti-Materiel Rifle", "Fuzil anti-material", "Patriotic Administration Center", "pesada", { automatons: "A", terminids: "B", illuminate: "C" }, false],
    ["FAF-14", "Spear", "Míssil teleguiado", "Patriotic Administration Center", "anti-tanque", { automatons: "S", terminids: "A", illuminate: "C" }, false, { resumo: "Trava no alvo pesado. Precisa de trava. Falha em alvo pequeno e agitado." }],
    ["RS-422", "Railgun", "Canhão elétrico", "Patriotic Administration Center", "anti-tanque", { automatons: "S", terminids: "B", illuminate: "C" }, false, { resumo: "Carrega e fura. Modo inseguro mata você se esquecer de soltar.", dicaTda: "Se a barra de carga te estressa, pegue Autocannon ou EAT." }],
    ["EAT-17", "Expendable Anti-Tank", "Anti-tanque descartável", "Patriotic Administration Center", "anti-tanque", { automatons: "S", terminids: "S+", illuminate: "C" }, true, { resumo: "Dois foguetes, joga fora, chama de novo. Sem mochila. Fácil e forte em inseto/robô.", dicaTda: "Melhor suporte fácil: aponta no pesado, dispara, esquece.", quandoUsar: "Aprender o jogo. Charger e Hulk.", quandoEvitar: "Illuminate, onde área vale mais." }],
    ["LAS-99", "Quasar Cannon", "Canhão quasar", "Patriotic Administration Center", "anti-tanque", { automatons: "S", terminids: "S", illuminate: "C" }, false, { resumo: "Um tiro carregado, recarga no ombro. Sem mochila. Pede paciência.", dicaTda: "Comece a carregar antes do bicho olhar. A espera é o custo." }],
    ["TX-41", "Sterilizer", "Gás", "Chemical Agents", "anti-tanque", { automatons: "D", terminids: "D", illuminate: "C" }, false, { resumo: "Gás de suporte. Hoje está no fundo da tabela. A granada de gás rende mais." }],
    ["CQC-9", "Defoliation Tool", "Ferramenta", "Python Commandos", "anti-tanque", { automatons: "D", terminids: "C", illuminate: "C" }, false],
    ["CQC-1", "One True Flag", "Bandeira", "Masters of Ceremony", "média", { automatons: "D", terminids: "D", illuminate: "D" }, false, { resumo: "Bandeira. Democracia visual. Zero combate real." }],
  ],
  arremessavel: [
    ["G-123", "Thermite", "Granada cola", "Democratic Detonation", "anti-tanque", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "Demo 30 · máx 3", resumo: "Cola no pesado e queima. A granada padrão do jogo inteiro.", dicaTda: "Jogue no Charger/Hulk/tanque. Espere. Não precisa de mira perfeita no ponto fraco.", quandoUsar: "Sempre que o time precisa apagar bicho grande.", quandoEvitar: "Só se você já tem Ultimatum e suporte AT de sobra e quer gás/fogo." }],
    ["G-142", "Pyrotech", "Granada", "Masters of Ceremony", "anti-tanque", { automatons: "S", terminids: "A", illuminate: "A" }, true, { extraLabel: "Demo 30 · máx 6" }],
    ["TED-63", "Dynamite", "Dinamite", "Borderline Justice", "pesada", { automatons: "S", terminids: "S", illuminate: "A" }, true, { extraLabel: "Demo 40 · máx 4", resumo: "Demo 40: fecha ninho pelo lado de fora. Espere o pavio." }],
    ["G-23", "Stun", "Granada atordoante", "Cutting Edge", "anti-tanque", { automatons: "S", terminids: "S", illuminate: "C" }, true, { extraLabel: "Demo 0 · máx 5", resumo: "Para o bicho. Não mata. Illuminate liga pouco. Robô e inseto congelam." }],
    ["G/SH-39", "Shield", "Granada de escudo", "Siege Breakers", "nenhuma", { automatons: "S", terminids: "S", illuminate: "A" }, true, { extraLabel: "Demo 20 · máx 4" }],
    ["G-4", "Gas", "Granada de gás", "Chemical Agents", "anti-tanque", { automatons: "A", terminids: "S", illuminate: "S+" }, true, { extraLabel: "Demo 30 · máx 4", resumo: "Nuvem que segura breach de inseto e Voteless. Excelente controle.", dicaTda: "Jogue no buraco que está nascendo bicho, não no que já encostou." }],
    ["TM-1", "Lure Mine", "Mina isca", "Redacted Regiment", "anti-tanque", { automatons: "A", terminids: "S", illuminate: "A" }, false, { extraLabel: "Demo 30 · máx 4" }],
    ["G-12", "High Explosive", "Granada HE", "Granada inicial", "pesada", { automatons: "A", terminids: "A", illuminate: "A" }, true, { extraLabel: "Demo 30 · máx 5", resumo: "A granada com que você começa. Honesta. Thermite e gás a substituem depois." }],
    ["G-16", "Impact", "Granada de impacto", "Helldivers Mobilize", "pesada", { automatons: "A", terminids: "S", illuminate: "S" }, true, { extraLabel: "Demo 30 · máx 5", resumo: "Explode na hora que encosta. Sem pavio. Fácil contra inseto." }],
    ["G-7", "Pineapple", "Granada", "Dust Devils", "média", { automatons: "A", terminids: "A", illuminate: "A" }, true, { extraLabel: "Demo 30 · máx 5" }],
    ["G-50", "Seeker", "Granada teleguiada", "Servants of Freedom", "pesada", { automatons: "A", terminids: "B", illuminate: "A" }, true, { extraLabel: "Demo 30 · máx 5" }],
    ["G-48", "Giga Grenade", "Granada gigante", "Entrenched Division", "anti-tanque", { automatons: "A", terminids: "A", illuminate: "A" }, false, { extraLabel: "Demo 40 · máx 2", resumo: "Poucas, enormes. Demo 40. Não desperdice." }],
    ["G-13", "Incendiary Impact", "Impacto incendiário", "Polar Patriots", "pesada", { automatons: "B", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "Demo 30 · máx 5", resumo: "Fogo na hora do impacto. Inseto e alienígena. Robô liga pouco." }],
    ["G-10", "Incendiary", "Granada de fogo", "Steeled Veterans", "pesada", { automatons: "B", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "Demo 30 · máx 5" }],
    ["G-6", "Frag", "Granada fragmentação", "Helldivers Mobilize", "média", { automatons: "B", terminids: "A", illuminate: "A" }, true, { extraLabel: "Demo 20 · máx 6" }],
    ["G-89", "Smokecreen", "Cortina de fumaça", "Superstore", "nenhuma", { automatons: "B", terminids: "D", illuminate: "D" }, true, { extraLabel: "Demo 0 · máx 5", resumo: "Fumaça. Só esconde de robô que mira. Inseto não se importa." }],
    ["G-3", "Smoke", "Fumaça", "Helldivers Mobilize", "nenhuma", { automatons: "B", terminids: "D", illuminate: "D" }, true, { extraLabel: "Demo 0 · máx 5" }],
    ["G-31", "Arc", "Granada elétrica", "Control Group", "pesada", { automatons: "C", terminids: "C", illuminate: "C" }, false, { extraLabel: "Demo 0 · máx 5" }],
    ["G-109", "Urchin", "Granada", "Force of Law", "anti-tanque", { automatons: "D", terminids: "D", illuminate: "C" }, false, { extraLabel: "Demo 0 · máx 5" }],
    ["K-2", "Throwing Knife", "Faca de arremesso", "Viper Commandos", "média", { automatons: "D", terminids: "D", illuminate: "D" }, false, { extraLabel: "Demo 10 · máx 20", resumo: "Faca. 20 no bolso. Quase nunca é a resposta certa." }],
  ],
  mochila: [
    ["AX/FLAM-75", "Hot Dog", "Cão de fogo", "Python Commandos", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, false, { resumo: "Drone lança-chamas nas costas. Limpa mole nas três frentes. Pode queimar o time se você ficar colado." }],
    ["LIFT-182", "Warp Pack", "Teleporte", "Control Group", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, false, { resumo: "Teleporta para frente, até através de parede. Esquenta e explode se abusar.", dicaTda: "Olhe a cor: roxo seguro, laranja dano, vermelho morte. Pare no laranja.", quandoUsar: "Fuga, atalho, objetivo. As três frentes.", quandoEvitar: "Se você spam o botão sem olhar o orbe." }],
    ["B-1", "Supply Pack", "Mochila de munição", "Patriotic Administration Center", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { resumo: "Munição para você e o time. A mochila mais simples e sempre útil.", dicaTda: "Aperte para reabastecer. Dê para o amigo que está seco." }],
    ["B-100", "Portable Hellbomb", "Hellbomb portátil", "Servants of Freedom", "", { automatons: "S+", terminids: "S", illuminate: "S" }, false, { resumo: "Uma bomba nuclear nas costas. Objetivo some. Você também, se não correr.", dicaTda: "Arma, corre, esconde. Não fique bonito olhando a explosão." }],
    ["AX/AR-23", "Guard Dog", "Cão de guarda", "Patriotic Administration Center", "", { automatons: "A", terminids: "A", illuminate: "S" }, true, { resumo: "Drone com rifle. Atira sozinho. Às vezes no amigo. Ainda assim vale." }],
    ["LIFT-850", "Jump Pack", "Mochila de pulo", "Patriotic Administration Center", "", { automatons: "S", terminids: "S", illuminate: "S" }, true, { resumo: "Pulo alto. Fuja de Charger, suba pedra. Recarga ~15 s. Corra antes de pular.", dicaTda: "Segure corrida, depois pule. Pulo parado rende pouco." }],
    ["SH-32", "Shield Generator Pack", "Escudo bolha", "Patriotic Administration Center", "", { automatons: "S", terminids: "S", illuminate: "S" }, true, { resumo: "Bolha que come tiro e cuspe. Recarrega sozinha. Conforto puro.", dicaTda: "A escolha fácil se você morre muito. Deixa o suporte sem mochila, porém." }],
    ["AX/LAS-5", "Rover", "Drone laser", "Patriotic Administration Center", "", { automatons: "B", terminids: "S", illuminate: "A" }, true],
    ["LIFT-860", "Hover Pack", "Mochila de pairar", "Borderline Justice", "", { automatons: "A", terminids: "S", illuminate: "A" }, false, { resumo: "Sobe e fica 6 s no ar atirando. Não cancela. Recarga 12 s." }],
    ["AX/ARC-3", "K-9", "Cão elétrico", "Force of Law", "", { automatons: "C", terminids: "B", illuminate: "B" }, false],
    ["AX/TX-13", "Dog Breath", "Cão de gás", "Chemical Agents", "", { automatons: "B", terminids: "A", illuminate: "B" }, true],
    ["SH-20", "Ballistic Shield Backpack", "Escudo balístico", "Patriotic Administration Center", "", { automatons: "B", terminids: "C", illuminate: "C" }, false, { resumo: "Escudo na mão. Robô de frente. Inseto rodeia e ignora." }],
    ["SH-51", "Directional Shield", "Escudo direcional", "Urban Legends", "", { automatons: "D", terminids: "D", illuminate: "D" }, false],
  ],
  eagle: [
    ["Eagle", "Strafing Run", "Rajada de canhão", "Hangar", "", { automatons: "S+", terminids: "S", illuminate: "S+" }, true, { extraLabel: "4 usos · 5 com upgrade", resumo: "O avião raspa o chão com canhão. Rápido, várias cargas, pouco fogo amigo se você marcar na frente.", dicaTda: "Marque a linha à frente do grupo, não em cima do time." }],
    ["Eagle", "Napalm Airstrike", "Napalm", "Hangar", "", { automatons: "B", terminids: "A", illuminate: "S" }, false, { extraLabel: "2 usos · 3 com upgrade", resumo: "Fogo no chão. Inseto e Voteless. Robô anda em volta." }],
    ["Eagle", "Airstrike", "Bombardeio", "Hangar", "", { automatons: "S+", terminids: "S+", illuminate: "A" }, true, { extraLabel: "2 usos · 3 com upgrade", resumo: "A linha de bombas clássica. Fecha fábrica, limpa grupo, quase sempre cabe no loadout." }],
    ["Eagle", "Cluster Bomb", "Cluster", "Hangar", "", { automatons: "A", terminids: "S", illuminate: "A" }, false, { extraLabel: "4 usos · 5 com upgrade", resumo: "Muitas bombinhas. Enxame. Péssima em amigo e em armadura pesada." }],
    ["Eagle", "500kg Bomb", "Bomba 500 kg", "Hangar", "", { automatons: "S+", terminids: "S+", illuminate: "B" }, false, { extraLabel: "1 uso · 2 com upgrade", resumo: "Uma cratera. Titã, fábrica, Hulk. Illuminate rende menos. Fogo amigo lendário.", dicaTda: "Marque, corra para trás. Se o marcador cair no pé, você some." }],
    ["Eagle", "Smoke Strike", "Fumaça", "Hangar", "", { automatons: "B", terminids: "D", illuminate: "D" }, true, { extraLabel: "2 usos · 3 com upgrade", resumo: "Fumaça aérea. Só contra robô que mira. O resto atravessa." }],
    ["Eagle", "110mm Rocket Pods", "Foguetes 110 mm", "Hangar", "", { automatons: "A", terminids: "A", illuminate: "D" }, false, { extraLabel: "3 usos · 4 com upgrade", resumo: "Foguetes num alvo. Robô e inseto médio. Illuminate quase ignora." }],
  ],
  sentinela: [
    ["E/AT-12", "Anti-Tank Emplacement", "Ninho anti-tanque", "Urban Legends", "anti-tanque", { automatons: "S+", terminids: "S", illuminate: "S+" }, false, { extraLabel: "Balístico", resumo: "Você senta e atira foguete. Defesa de ponto. As três frentes." }],
    ["A/MG-43", "Machine Gun Sentry", "Sentinela MG", "Patriotic Administration Center", "média", { automatons: "S", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "Balístico", resumo: "Torre de metralhadora. Barata, rápida, limpa mole. A sentinela fácil.", dicaTda: "Coloque olhando a trilha. Pronto." }],
    ["A/ARC-3", "Tesla Tower", "Torre tesla", "Patriotic Administration Center", "pesada", { automatons: "B", terminids: "S+", illuminate: "S+" }, false, { extraLabel: "Arco", resumo: "Raio em volta. Inseto morre. Helldiver também. Avise o time.", dicaTda: "Longe da rota do time. Se alguém corre cego, alguém morre." }],
    ["A/G-16", "Gatling Sentry", "Sentinela gatling", "Patriotic Administration Center", "média", { automatons: "A", terminids: "S", illuminate: "S+" }, false, { extraLabel: "Balístico" }],
    ["A/AC-8", "Autocannon Sentry", "Sentinela autocannon", "Patriotic Administration Center", "anti-tanque", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "Balístico", resumo: "A melhor torre geral. Fura médio/pesado nas três frentes.", dicaTda: "Se só puder levar uma sentinela, leve esta." }],
    ["E/MG-101", "HMG Emplacement", "Ninho HMG", "Patriotic Administration Center", "pesada", { automatons: "S+", terminids: "S+", illuminate: "S+" }, false, { extraLabel: "Balístico", resumo: "Você opera a metralhadora pesada. Defesa de bandeira/extract." }],
    ["A/FLAM-40", "Flame Sentry", "Sentinela de fogo", "Urban Legends", "pesada", { automatons: "B", terminids: "S", illuminate: "S" }, false, { extraLabel: "Fogo" }],
    ["A/MLS-4X", "Rocket Sentry", "Sentinela de foguete", "Patriotic Administration Center", "anti-tanque", { automatons: "S+", terminids: "S", illuminate: "S" }, true, { extraLabel: "Balístico", resumo: "Torre que atira foguete no pesado. Robô ama. Illuminate ainda respeita." }],
    ["MD-I4", "Incendiary Mines", "Minas de fogo", "Patriotic Administration Center", "média", { automatons: "B", terminids: "S", illuminate: "S" }, false, { extraLabel: "Explosão", resumo: "Campo de fogo. Inseto. Time pisa e chora. Avise no chat." }],
    ["MD-8", "Gas Mines", "Minas de gás", "Patriotic Administration Center", "anti-tanque", { automatons: "S", terminids: "S", illuminate: "S" }, false, { extraLabel: "Gás" }],
    ["A/LAS-98", "Laser Sentry", "Sentinela laser", "Control Group", "pesada", { automatons: "C", terminids: "B", illuminate: "A" }, true, { extraLabel: "Laser" }],
    ["A/M-23", "EMS Mortar Sentry", "Morteiro EMS", "Patriotic Administration Center", "anti-tanque", { automatons: "A", terminids: "A", illuminate: "A" }, false, { extraLabel: "Atordoamento", resumo: "Morteiro que para em vez de matar. Menos fogo amigo letal que o morteiro normal." }],
    ["MD-6", "Anti-Personnel Minefield", "Campo minado", "Patriotic Administration Center", "média", { automatons: "B", terminids: "A", illuminate: "A" }, false, { extraLabel: "Explosão" }],
    ["E/GL-21", "Grenadier Battlement", "Muralha granada", "Patriotic Administration Center", "média", { automatons: "A", terminids: "A", illuminate: "A" }, false, { extraLabel: "Explosão" }],
    ["A/GM-17", "Gas Mortar Sentry", "Morteiro de gás", "Entrenched Division", "anti-tanque", { automatons: "A", terminids: "B", illuminate: "B" }, false, { extraLabel: "Gás" }],
    ["FX-12", "Shield Generator Relay", "Relé de escudo", "Patriotic Administration Center", "", { automatons: "B", terminids: "D", illuminate: "B" }, true, { extraLabel: "Defesa", resumo: "Bolha no chão para o time. Robô atira nela. Inseto ignora e entra." }],
    ["A/M-12", "Mortar Sentry", "Morteiro", "Patriotic Administration Center", "média", { automatons: "S", terminids: "D", illuminate: "D" }, false, { extraLabel: "Explosão", resumo: "Atira longe sozinho. Ótimo em robô parado. Mata o time em inseto, porque o bicho corre até você.", dicaTda: "Nunca em missão de inseto com time. O morteiro segue o Caçador até o seu pé." }],
    ["MD-17", "Anti-Tank Mines", "Minas anti-tanque", "Patriotic Administration Center", "anti-tanque", { automatons: "S", terminids: "A", illuminate: "D" }, false, { extraLabel: "Explosão" }],
  ],
  booster: [
    ["Booster", "Hellpod Space Optimization", "Munição cheia no drop", "Helldivers Mobilize", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "20 medalhas", resumo: "Você sai da cápsula com stim, granada e munição no máximo. O booster que todo mundo deveria ter.", dicaTda: "Se ninguém pegou, pegue você. Zero micro. Só funciona." }],
    ["Booster", "Experimental Infusion", "Stim mais forte", "Viper Commandos", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "80 medalhas", resumo: "Stim cura mais e ainda dá velocidade. Vício saudável. S+ nas três." }],
    ["Booster", "Stamina Enhancement", "Mais fôlego", "Helldivers Mobilize", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "75 medalhas", resumo: "Corre mais tempo. Inseto não alcança. Extract não vira caminhada." }],
    ["Booster", "Vitality Enhancement", "Mais vida", "Helldivers Mobilize", "", { automatons: "S", terminids: "S", illuminate: "S" }, true, { extraLabel: "20 medalhas", resumo: "Reduz dano. Barato. Sempre útil, principalmente em armadura pesada." }],
    ["Booster", "Increased Reinforcement Budget", "Mais reforços", "Helldivers Mobilize", "", { automatons: "S", terminids: "S", illuminate: "S" }, true, { extraLabel: "150 medalhas", resumo: "O time morre mais vezes antes do game over. Dificuldade alta agradece." }],
    ["Booster", "Armed Resupply Pods", "Caixa que atira", "Urban Legends", "", { automatons: "C", terminids: "A", illuminate: "A" }, true, { extraLabel: "55 medalhas" }],
    ["Booster", "Sample Extricator", "Amostra", "Borderline Justice", "", { automatons: "A", terminids: "A", illuminate: "A" }, true, { extraLabel: "65 medalhas" }],
    ["Booster", "Sample Scanner", "Scanner de amostra", "Masters of Ceremony", "", { automatons: "A", terminids: "A", illuminate: "A" }, true, { extraLabel: "65 medalhas" }],
    ["Booster", "Muscle Enhancement", "Menos travamento no terreno", "Helldivers Mobilize", "", { automatons: "B", terminids: "S", illuminate: "B" }, true, { extraLabel: "75 medalhas", resumo: "Neve, lama, planta. Inseto em planeta ruim vira S. No resto é luxo." }],
    ["Booster", "Flexible Reinforcement Budget", "Reforço flexível", "Steeled Veterans", "", { automatons: "B", terminids: "B", illuminate: "B" }, true, { extraLabel: "75 medalhas" }],
    ["Booster", "Localization Confusion", "Menos spawn", "Cutting Edge", "", { automatons: "B", terminids: "B", illuminate: "B" }, true, { extraLabel: "18 medalhas" }],
    ["Booster", "Dead Sprint", "Corre machucado", "Truth Enforcers", "", { automatons: "C", terminids: "B", illuminate: "B" }, false, { extraLabel: "35 medalhas" }],
    ["Booster", "Expert Extraction Pilot", "Extract mais rápido", "Democratic Detonation", "", { automatons: "C", terminids: "C", illuminate: "C" }, true, { extraLabel: "55 medalhas" }],
    ["Booster", "Firebomb Hellpods", "Cápsula explosiva", "Freedom’s Flame", "", { automatons: "D", terminids: "C", illuminate: "C" }, false, { extraLabel: "60 medalhas", resumo: "Tudo que cai do céu explode em fogo. Inclusive reforço no pé do amigo." }],
    ["Booster", "UAV Recon Booster", "Radar", "Helldivers Mobilize", "", { automatons: "D", terminids: "D", illuminate: "D" }, true, { extraLabel: "40 medalhas" }],
    ["Booster", "Motivational Shocks", "Choque", "Polar Patriots", "", { automatons: "D", terminids: "C", illuminate: "D" }, false, { extraLabel: "15 medalhas" }],
    ["Booster", "Stun Pods", "Cápsula de stun", "Force of Law", "", { automatons: "D", terminids: "D", illuminate: "D" }, false, { extraLabel: "55 medalhas" }],
    ["Booster", "Concealed Insertion", "Drop silencioso", "Redacted Regiment", "", { automatons: "A", terminids: "D", illuminate: "D" }, true, { extraLabel: "40 medalhas", resumo: "Chegada discreta. Robô detecta. Inseto e alienígena ligam pouco." }],
  ],
  armadura: [
    ["Passiva", "Med-Kit", "Mais stims", "Várias armaduras", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "+2 stims · stim dura +2 s", resumo: "Mais cura no bolso. A passiva mais simples e mais forte para quem está aprendendo.", dicaTda: "Se você morre por esquecer de gerenciar, isto perdoa." }],
    ["Passiva", "True Grit", "Mãos firmes", "Várias armaduras", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "+20 handling · +30% reload de suporte", resumo: "Arma pesada recarrega mais rápido. Autocannon e similares ficam dóceis." }],
    ["Passiva", "Reduced Signature", "Mais furtivo", "Várias armaduras", "", { automatons: "S+", terminids: "B", illuminate: "S" }, true, { extraLabel: "-50% ruído · -40% detecção", resumo: "Robô escuta menos. Inseto ainda cheira você. Stealth contra Automatons." }],
    ["Passiva", "Siege-Ready", "Mais munição", "Siege Breakers", "", { automatons: "S", terminids: "S", illuminate: "S" }, true, { extraLabel: "+30% reload primária · +20% munição", resumo: "Mais bala, reload mais rápido. Qualquer frente." }],
    ["Passiva", "Engineering Kit", "Mais granadas", "Várias armaduras", "", { automatons: "S", terminids: "S", illuminate: "S" }, true, { extraLabel: "-30% recuo agachado · +2 granadas", resumo: "Duas granadas a mais. Thermite e gás rendem o dobro de chance." }],
    ["Passiva", "Oxygenator", "Mais velocidade", "Várias armaduras", "", { automatons: "S", terminids: "S", illuminate: "S" }, true, { extraLabel: "+10% corrida · slide maior" }],
    ["Passiva", "Concussive Padding, Reinforced", "Anti-explosão", "Várias armaduras", "", { automatons: "S+", terminids: "B", illuminate: "A" }, true, { extraLabel: "+50% resist explosão · +30 armadura", resumo: "Robô explode o chão. Isto deixa você em pé." }],
    ["Passiva", "Desert Stormer", "Resistência elemental", "Dust Devils", "", { automatons: "A", terminids: "S+", illuminate: "A" }, true, { extraLabel: "+40% fogo/gás/ácido/elétrico · +20% arremesso" }],
    ["Passiva", "Adreno-Defibrillator", "Revive uma vez", "Várias armaduras", "", { automatons: "B", terminids: "B", illuminate: "A" }, true, { extraLabel: "Revive temporário · stim +2 s · resist elétrico" }],
    ["Passiva", "Ballistic Padding", "Peito reforçado", "Várias armaduras", "", { automatons: "S", terminids: "A", illuminate: "A" }, true, { extraLabel: "+25% peito e explosão · sem sangramento" }],
    ["Passiva", "Acclimated", "Resistência elemental", "Várias armaduras", "", { automatons: "A", terminids: "S+", illuminate: "A" }, true, { extraLabel: "+50% fogo/gás/ácido/elétrico" }],
    ["Passiva", "Unflinching", "Menos tremer", "Várias armaduras", "", { automatons: "A", terminids: "A", illuminate: "A" }, true, { extraLabel: "Menos flinch · +25 armadura · radar" }],
    ["Passiva", "Peak Physique", "Corpo a corpo", "Viper Commandos", "", { automatons: "A", terminids: "A", illuminate: "A" }, true, { extraLabel: "+40% melee · +30 ergonomia" }],
    ["Passiva", "Electrical Conduit", "Anti-raio", "Várias armaduras", "", { automatons: "D", terminids: "D", illuminate: "A" }, true, { extraLabel: "+95% resist elétrico", resumo: "Quase imune a tesla e Illuminate elétrico. Inútil no resto." }],
    ["Passiva", "Democracy Protects", "Chance de não morrer", "Várias armaduras", "", { automatons: "A", terminids: "A", illuminate: "A" }, true, { extraLabel: "50% de ignorar tiro letal · sem sangramento", resumo: "Metade das mortes vira susto. Fácil de gostar. Não é plano A." }],
    ["Passiva", "Concussive Padding, Hazmat", "Anti-explosão e gás", "Várias armaduras", "", { automatons: "S+", terminids: "B", illuminate: "B" }, true, { extraLabel: "+50% explosão · +25% gás · menos recuo de pistola" }],
    ["Passiva", "Concussive Padding, Grenadier", "Anti-explosão e granadas", "Várias armaduras", "", { automatons: "S+", terminids: "B", illuminate: "B" }, true, { extraLabel: "+50% explosão · +2 granadas" }],
    ["Passiva", "Rock Solid", "Menos ragdoll", "Várias armaduras", "", { automatons: "B", terminids: "B", illuminate: "B" }, true, { extraLabel: "Menos ragdoll · +40% melee" }],
    ["Passiva", "Reinforced Epaulettes", "Reload e melee", "Várias armaduras", "", { automatons: "B", terminids: "B", illuminate: "B" }, true, { extraLabel: "+30% reload primária · 50% evitar lesão · +20% melee" }],
    ["Passiva", "Gunslinger", "Pistoleiro", "Várias armaduras", "", { automatons: "B", terminids: "B", illuminate: "B" }, true, { extraLabel: "Secundária mais rápida e estável" }],
    ["Passiva", "Fortified", "Anti-explosão e recuo", "Várias armaduras", "", { automatons: "S+", terminids: "C", illuminate: "B" }, true, { extraLabel: "+50% explosão · -30% recuo agachado", resumo: "A passiva clássica contra robô. Inseto não explode tanto, então cai." }],
    ["Passiva", "Scout", "Radar e furtivo", "Várias armaduras", "", { automatons: "A", terminids: "C", illuminate: "B" }, true, { extraLabel: "Radar · -40% detecção" }],
    ["Passiva", "Extra Padding", "Mais armadura", "Várias armaduras", "", { automatons: "B", terminids: "B", illuminate: "B" }, true, { extraLabel: "+50 rating de armadura" }],
    ["Passiva", "Supplementary Adrenaline", "Stamina ao tomar dano", "Várias armaduras", "", { automatons: "B", terminids: "B", illuminate: "B" }, true, { extraLabel: "Stamina ao ser atingido · +25 armadura" }],
    ["Passiva", "Kinetic Displacement Mitigation", "Anti-impacto", "Várias armaduras", "", { automatons: "A", terminids: "A", illuminate: "B" }, true, { extraLabel: "+50% fogo · 50% evitar lesão · -30% impacto" }],
    ["Passiva", "Feet First", "Pés silenciosos", "Várias armaduras", "", { automatons: "B", terminids: "D", illuminate: "C" }, true, { extraLabel: "-50% ruído · +30% POI · pernas imunes" }],
    ["Passiva", "Integrated Explosives", "Explode ao morrer", "Servants of Freedom", "", { automatons: "C", terminids: "C", illuminate: "C" }, false, { extraLabel: "Explode 1,5 s após a morte · +2 granadas", resumo: "Você vira granada. O time precisa sair. Engraçado, raramente ótimo." }],
    ["Passiva", "Advanced Filtration", "Anti-gás", "Chemical Agents", "", { automatons: "C", terminids: "C", illuminate: "C" }, true, { extraLabel: "+80% resist gás" }],
    ["Passiva", "Inflammable", "Anti-fogo", "Freedom’s Flame", "", { automatons: "B", terminids: "S+", illuminate: "C" }, true, { extraLabel: "+75% resist fogo", resumo: "Você vira o cara do lança-chamas. Inseto. No resto, passivas gerais ganham." }],
    ["Passiva", "Servo-Assisted", "Arremesso longo", "Várias armaduras", "", { automatons: "C", terminids: "B", illuminate: "C" }, true, { extraLabel: "+30% arremesso · +50% vida do membro" }],
  ],
  warbond: [
    ["Warbond", "Democratic Detonation", "Passe explosivo", "1000 SC", "", "S+", true, { extraLabel: "1000 Super Credits", resumo: "Eruptor, besta e pistola-granada. O melhor primeiro gasto de Super Credits.", dicaTda: "Se só puder comprar um, compre este.", quandoUsar: "Primeiro passe pago.", quandoEvitar: "Nada. É o valor máximo." }],
    ["Warbond", "Dust Devils", "Passe do Coyote", "1000 SC", "", "S+", true, { extraLabel: "1000 Super Credits", resumo: "AR-2 Coyote e Solo Silo. O rifle fácil de inseto/alienígena mora aqui." }],
    ["Warbond", "Control Group", "Passe experimental", "1000 SC", "", "S+", true, { extraLabel: "1000 Super Credits", resumo: "Warp Pack e Variable. Mobilidade e arma estranha de alto teto." }],
    ["Warbond", "Servants of Freedom", "Passe suicida", "1000 SC", "", "S+", true, { extraLabel: "1000 Super Credits", resumo: "Ultimatum, Hellbomb portátil, Double-Edge Sickle. Alto risco, alto retorno." }],
    ["Warbond", "Redacted Regiment", "Passe furtivo", "1000 SC", "", "S", true, { extraLabel: "1000 Super Credits", resumo: "Censor, C4, Re-Educator. Stealth contra robô." }],
    ["Warbond", "Polar Patriots", "Passe do Purifier", "1000 SC", "", "S", true, { extraLabel: "1000 Super Credits", resumo: "PLAS-101 Purifier. A melhor primária do jogo está aqui. Vale cada crédito." }],
    ["Warbond", "Siege Breakers", "Passe de cerco", "1000 SC", "", "S", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Exo Experts", "Passe de exosuit", "1000 SC", "", "S", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Urban Legends", "Passe urbano", "1000 SC", "", "A", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Entrenched Division", "Passe de trincheira", "1000 SC", "", "A", true, { extraLabel: "1000 Super Credits", resumo: "Stoker e Cremator. Fogo e SMG. Bom, não obrigatório." }],
    ["Warbond", "Borderline Justice", "Passe faroeste", "1000 SC", "", "A", true, { extraLabel: "1000 Super Credits", resumo: "Talon e Hover Pack. A pistola laser sozinha já puxa o passe." }],
    ["Warbond", "Freedom’s Flame", "Passe de fogo", "1000 SC", "", "A", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Chemical Agents", "Passe de gás", "1000 SC", "", "B", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Cutting Edge", "Passe de energia", "1000 SC", "", "B", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Steeled Veterans", "Passe veterano", "1000 SC", "", "B", true, { extraLabel: "1000 Super Credits", resumo: "Senator, Dominator, Breaker Incendiary. Bom, mas já não é o primeiro da fila." }],
    ["Warbond", "Viper Commandos", "Passe selva", "1000 SC", "", "B", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Truth Enforcers", "Passe polícia", "1000 SC", "", "B", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Python Commandos", "Passe python", "1000 SC", "", "B", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Force of Law", "Passe da lei", "1000 SC", "", "C", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Masters of Ceremony", "Passe cerimonial", "1000 SC", "", "C", true, { extraLabel: "1000 Super Credits" }],
    ["Warbond", "Halo: ODST", "Crossover Halo", "1500 SC", "", "D", true, { extraLabel: "1500 Super Credits", resumo: "Mais caro, meta fraca, sem acessório. Compre só se ama Halo.", quandoEvitar: "Se o objetivo é ficar mais forte." }],
    ["Warbond", "Righteous Revenants", "Crossover Killzone", "1500 SC", "", "D", true, { extraLabel: "1500 Super Credits", resumo: "Mesma história do Halo: visual, não força." }],
  ],
  orbital: [
    ["Orbital", "Laser", "Laser da nave", "Bridge", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "Recarga 300 s", resumo: "Um raio que persegue o pesado. As três frentes. Cinco minutos de espera.", dicaTda: "Marque o Titã/Hulk/Harvester. Não gaste num Catador." }],
    ["Orbital", "Precision Strike", "Tiro certeiro", "Bridge", "", { automatons: "S", terminids: "S", illuminate: "S" }, true, { extraLabel: "Recarga 90 s", resumo: "Um tiro rápido e limpo. Fábrica, ninho, Hulk. O orbital mais fácil.", dicaTda: "Se você só leva um orbital, leve este." }],
    ["Orbital", "Gas Strike", "Gás orbital", "Bridge", "", { automatons: "S+", terminids: "S+", illuminate: "S" }, true, { extraLabel: "Recarga 75 s", resumo: "Nuvem no ponto. Breach de inseto morre. Recarga curta." }],
    ["Orbital", "Napalm Barrage", "Barragem de napalm", "Bridge", "", { automatons: "A", terminids: "S", illuminate: "S" }, false, { extraLabel: "Recarga 240 s" }],
    ["Orbital", "Gatling Barrage", "Gatling orbital", "Bridge", "", { automatons: "S+", terminids: "S+", illuminate: "A" }, true, { extraLabel: "Recarga 70 s", resumo: "Chuva de canhão rápida. Recarga curta. Quase sempre cabe." }],
    ["Orbital", "120mm HE Barrage", "Barragem 120 mm", "Bridge", "", { automatons: "S", terminids: "B", illuminate: "A" }, false, { extraLabel: "Recarga 180 s" }],
    ["Orbital", "Airburst Strike", "Airburst orbital", "Bridge", "", { automatons: "A", terminids: "S+", illuminate: "A" }, false, { extraLabel: "Recarga 100 s" }],
    ["Orbital", "Walking Barrage", "Barragem andante", "Bridge", "", { automatons: "S", terminids: "B", illuminate: "A" }, false, { extraLabel: "Recarga 240 s" }],
    ["Orbital", "EMS Strike", "Stun orbital", "Bridge", "", { automatons: "D", terminids: "B", illuminate: "B" }, true, { extraLabel: "Recarga 75 s" }],
    ["Orbital", "380mm HE Barrage", "Barragem 380 mm", "Bridge", "", { automatons: "B", terminids: "B", illuminate: "C" }, false, { extraLabel: "Recarga 240 s", resumo: "O mapa inteiro treme. Inclusive o time. Difícil de usar bem." }],
    ["Orbital", "Smoke Strike", "Fumaça orbital", "Bridge", "", { automatons: "B", terminids: "D", illuminate: "D" }, true, { extraLabel: "Recarga 75 s" }],
    ["Orbital", "Railcannon Strike", "Trilho orbital", "Bridge", "", { automatons: "A", terminids: "A", illuminate: "D" }, true, { extraLabel: "Recarga 180 s", resumo: "A nave escolhe o alvo mais pesado perto do marcador. Illuminate quase ignora." }],
  ],
  veiculo: [
    ["M-102", "Fast Recon Vehicle", "Jipe FRV", "Patriotic Administration Center", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "4 lugares · 480 s · HMG traseira", resumo: "O jipe. Corre o mapa, HMG na caçamba. As três frentes. Melhor veículo fácil.", dicaTda: "Um dirige, outro atira. Não atropela o time de propósito. Ou pelo menos avise." }],
    ["TD-220", "Bastion MK XVI", "Tanque", "Patriotic Administration Center", "", { automatons: "S+", terminids: "B", illuminate: "B" }, false, { extraLabel: "4 lugares · 780 s · canhão AT", resumo: "Tanque lento e duro. Robô. Inseto sobe em você. Recarga enorme." }],
    ["M-104", "Incinerator FRV", "Jipe lança-chamas", "Recompensa de campanha", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "4 lugares · 480 s · lança-chamas", resumo: "Jipe que cospe fogo. Enxame no asfalto." }],
    ["M-103", "Supply FRV", "Jipe de suprimento", "Recompensa de campanha", "", { automatons: "S+", terminids: "S+", illuminate: "S+" }, true, { extraLabel: "4 lugares · 480 s · torre automática", resumo: "Jipe que também é caixa de munição. O time inteiro agradece." }],
    ["EXO-49", "Emancipator Exosuit", "Mecha autocannon", "Patriotic Administration Center", "", { automatons: "S", terminids: "S", illuminate: "S+" }, false, { extraLabel: "1 piloto · 600 s · dois autocannons", resumo: "O mecha mais seguro. Dois canhões. Illuminate ama." }],
    ["EXO-55", "Breakthrough Exosuit", "Mecha escopeta", "Exo Experts", "", { automatons: "S", terminids: "S", illuminate: "S+" }, false, { extraLabel: "1 piloto · 600 s", resumo: "Escopeta pesada + escudo corpo a corpo. Chega perto." }],
    ["EXO-51", "Lumberer Exosuit", "Mecha misto", "Exo Experts", "", { automatons: "S", terminids: "S", illuminate: "B" }, false, { extraLabel: "1 piloto · 600 s · canhão + fogo" }],
    ["EXO-45", "Patriot Exosuit", "Mecha clássico", "Patriotic Administration Center", "", { automatons: "A", terminids: "A", illuminate: "B" }, false, { extraLabel: "1 piloto · 600 s · minigun + míssil", resumo: "O primeiro mecha. Ainda serve. Os novos rendem mais." }],
  ],
};

function linhaParaItem(row, cat) {
  const [codigo, nome, tipo, origem, penetracao, tiersOrRank, facil, extra] = row;
  const rankUnico = typeof tiersOrRank === "string" ? tiersOrRank : null;
  const tiers = rankUnico ? undefined : tiersOrRank;
  return montar(
    {
      codigo,
      nome,
      tipo,
      origem,
      penetracao,
      tiers,
      rankUnico,
      facil,
      extraLabel: extra?.extraLabel,
      extra,
    },
    cat
  );
}

const itens = {};
for (const cat of categorias) {
  if (cat.id === "primaria") continue;
  itens[cat.id] = DADOS[cat.id].map((row) => linhaParaItem(row, cat));
}

const saida = `window.CATEGORIAS = ${JSON.stringify(
  categorias.map(({ comoUsarPadrao, facilPadrao, alcancePadrao, ...rest }) => rest),
  null,
  2
)};

window.ITENS = ${JSON.stringify(itens, null, 2)};
`;

fs.writeFileSync(
  new URL("../assets/data/catalogo.js", import.meta.url),
  saida
);

const counts = Object.fromEntries(
  Object.entries(itens).map(([k, v]) => [k, v.length])
);
console.log(counts);
console.log(
  "total",
  Object.values(itens).reduce((a, b) => a + b.length, 0)
);
