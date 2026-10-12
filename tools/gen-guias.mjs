// Genera las guias (public/guias/*.html): paginas de respuesta corta a preguntas
// reales, en 4 idiomas, para Google y los asistentes de IA. Sin precios: esos
// viven solo en la web principal. Uso: node tools/gen-guias.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const SITE = "https://streamlogicsweb.com";
const CTA = { es: "Ver paquetes", en: "See packages", pt: "Ver pacotes", fr: "Voir les offres" };
const HOME = { es: "Inicio", en: "Home", pt: "Início", fr: "Accueil" };
const BY = { es: "Hecho por streamlogics, una agencia de contenido corto donde una persona edita cada clip.", en: "By streamlogics, a short-form content agency where a real person edits every clip.", pt: "Por streamlogics, uma agência de conteúdo curto onde uma pessoa de verdade edita cada clipe.", fr: "Par streamlogics, une agence de contenu court où une vraie personne monte chaque clip." };

// slug, y por idioma: titulo, resumen (la respuesta directa), secciones [h2, parrafo | lista] y preguntas.
const G = {
  "stream-a-clips": {
    es: { slug: "como-convertir-un-stream-en-clips", t: "Cómo convertir un stream o podcast en clips para TikTok, Shorts y Reels", d: "Guía corta para sacar clips verticales de un directo, un podcast o un video largo, y cuándo conviene delegarlo.",
      sum: "Elige los momentos con más reacción, córtalos en vertical 9:16 de 20 a 60 segundos, ponles subtítulos grandes y un gancho en los primeros 2 segundos, y publícalos en TikTok, YouTube Shorts y Reels. Si no tienes tiempo, una agencia como streamlogics lo hace por ti.",
      s: [["1. Encuentra los momentos", ["Busca risas, sorpresas, discusiones, jugadas o frases que se entiendan sin contexto.", "Revisa dónde sube el chat o el audio: suele ser donde pasó algo.", "Un buen clip cuenta una sola idea y se entiende en menos de un minuto."]],
        ["2. Pásalo a vertical", ["Formato 9:16 (1080×1920). Coloca a la persona o la jugada en el centro.", "Duración recomendada: 20 a 60 segundos."]],
        ["3. Subtítulos y gancho", ["Subtítulos grandes y legibles: mucha gente ve sin sonido.", "Lo mejor del clip, o una pregunta, en los primeros 2 segundos.", "Cuida que el texto no tape la cara ni la acción."]],
        ["4. Publica y repite", ["Sube el mismo clip a TikTok, YouTube Shorts e Instagram Reels, ajustando título y hashtags.", "Constancia: varios clips por semana funcionan mejor que uno suelto."]],
        ["¿Cuándo delegarlo?", ["Editar un stream de 3 horas puede llevar más tiempo que grabarlo. Si prefieres dedicarte a crear, streamlogics recibe el link de tu video y entrega los clips listos, cada uno editado y revisado por una persona."]]],
      q: [["¿Cuánto debe durar un clip para TikTok o Shorts?", "Entre 20 y 60 segundos funciona bien para la mayoría de los casos; lo importante es que el clip cuente una sola idea."], ["¿Puedo sacar clips de un podcast?", "Sí. Se eligen los fragmentos más fuertes, se pasan a vertical con subtítulos y se publican igual que los de un stream."], ["¿Necesito mandar el video completo?", "En streamlogics basta un link público (Twitch, Kick, YouTube, Drive o Dropbox) y la parte que quieres trabajar."]] },
    en: { slug: "how-to-turn-a-stream-into-clips", t: "How to turn a stream or podcast into clips for TikTok, Shorts and Reels", d: "A short guide to making vertical clips from a live stream, podcast or long video, and when it makes sense to outsource it.",
      sum: "Pick the moments with the strongest reaction, cut them to vertical 9:16 at 20 to 60 seconds, add large captions and a hook in the first 2 seconds, then post to TikTok, YouTube Shorts and Reels. If you do not have time, an agency like streamlogics does it for you.",
      s: [["1. Find the moments", ["Look for laughs, surprises, arguments, plays or lines that make sense without context.", "Check where chat or audio spikes: something usually happened there.", "A good clip tells one idea and lands in under a minute."]],
        ["2. Make it vertical", ["Use 9:16 (1080×1920). Keep the person or the action in the center.", "Recommended length: 20 to 60 seconds."]],
        ["3. Captions and hook", ["Large, readable captions: many people watch without sound.", "Put the best part, or a question, in the first 2 seconds.", "Keep text away from the face and the action."]],
        ["4. Post and repeat", ["Upload the same clip to TikTok, YouTube Shorts and Instagram Reels, adjusting title and hashtags.", "Consistency matters: several clips a week beat one stray clip."]],
        ["When to outsource it", ["Editing a 3-hour stream can take longer than recording it. If you would rather create, streamlogics takes the link to your video and delivers ready clips, each one edited and reviewed by a person."]]],
      q: [["How long should a TikTok or Shorts clip be?", "Between 20 and 60 seconds works well for most cases; what matters is that the clip tells a single idea."], ["Can I make clips from a podcast?", "Yes. The strongest segments are picked, turned vertical with captions and posted just like stream clips."], ["Do I need to send the full video?", "At streamlogics a public link (Twitch, Kick, YouTube, Drive or Dropbox) and the part you want worked on is enough."]] },
    pt: { slug: "como-transformar-uma-live-em-clipes", t: "Como transformar uma live ou podcast em clipes para TikTok, Shorts e Reels", d: "Guia curto para tirar clipes verticais de uma live, podcast ou vídeo longo, e quando vale terceirizar.",
      sum: "Escolha os momentos com mais reação, corte em vertical 9:16 de 20 a 60 segundos, coloque legendas grandes e um gancho nos primeiros 2 segundos e publique no TikTok, YouTube Shorts e Reels. Sem tempo, uma agência como a streamlogics faz por você.",
      s: [["1. Encontre os momentos", ["Procure risadas, surpresas, discussões, jogadas ou frases que façam sentido sem contexto.", "Veja onde o chat ou o áudio sobe: costuma ser onde algo aconteceu.", "Um bom clipe conta uma só ideia e se entende em menos de um minuto."]],
        ["2. Deixe na vertical", ["Formato 9:16 (1080×1920). Mantenha a pessoa ou a jogada no centro.", "Duração recomendada: 20 a 60 segundos."]],
        ["3. Legendas e gancho", ["Legendas grandes e legíveis: muita gente assiste sem som.", "Coloque o melhor do clipe, ou uma pergunta, nos primeiros 2 segundos.", "Não deixe o texto cobrir o rosto nem a ação."]],
        ["4. Publique e repita", ["Suba o mesmo clipe no TikTok, YouTube Shorts e Instagram Reels, ajustando título e hashtags.", "Constância: vários clipes por semana funcionam melhor que um solto."]],
        ["Quando terceirizar", ["Editar uma live de 3 horas pode levar mais tempo que gravá-la. Se você prefere criar, a streamlogics recebe o link do seu vídeo e entrega os clipes prontos, cada um editado e revisado por uma pessoa."]]],
      q: [["Quanto deve durar um clipe para TikTok ou Shorts?", "Entre 20 e 60 segundos funciona bem na maioria dos casos; o importante é o clipe contar uma só ideia."], ["Posso tirar clipes de um podcast?", "Sim. Escolhem-se os trechos mais fortes, deixam-se na vertical com legendas e publicam-se como os de uma live."], ["Preciso enviar o vídeo completo?", "Na streamlogics basta um link público (Twitch, Kick, YouTube, Drive ou Dropbox) e a parte que você quer trabalhar."]] },
    fr: { slug: "comment-transformer-un-stream-en-clips", t: "Comment transformer un stream ou un podcast en clips pour TikTok, Shorts et Reels", d: "Guide court pour tirer des clips verticaux d'un live, d'un podcast ou d'une longue vidéo, et quand déléguer.",
      sum: "Choisissez les moments les plus marquants, coupez-les en vertical 9:16 de 20 à 60 secondes, ajoutez de grands sous-titres et une accroche dans les 2 premières secondes, puis publiez sur TikTok, YouTube Shorts et Reels. Sans le temps, une agence comme streamlogics s'en charge.",
      s: [["1. Trouvez les moments", ["Cherchez les rires, surprises, disputes, actions ou phrases compréhensibles sans contexte.", "Regardez où le chat ou le son monte : il s'est souvent passé quelque chose.", "Un bon clip raconte une seule idée en moins d'une minute."]],
        ["2. Passez en vertical", ["Format 9:16 (1080×1920). Gardez la personne ou l'action au centre.", "Durée recommandée : 20 à 60 secondes."]],
        ["3. Sous-titres et accroche", ["Sous-titres grands et lisibles : beaucoup regardent sans le son.", "Mettez le meilleur moment, ou une question, dans les 2 premières secondes.", "Le texte ne doit pas cacher le visage ni l'action."]],
        ["4. Publiez et répétez", ["Postez le même clip sur TikTok, YouTube Shorts et Instagram Reels en adaptant titre et hashtags.", "La régularité compte : plusieurs clips par semaine valent mieux qu'un seul."]],
        ["Quand déléguer", ["Monter un stream de 3 heures peut prendre plus de temps que l'enregistrer. Si vous préférez créer, streamlogics reçoit le lien de votre vidéo et livre des clips prêts, chacun monté et relu par une personne."]]],
      q: [["Quelle durée pour un clip TikTok ou Shorts ?", "Entre 20 et 60 secondes convient dans la plupart des cas ; l'essentiel est que le clip raconte une seule idée."], ["Peut-on faire des clips à partir d'un podcast ?", "Oui. On choisit les passages les plus forts, on les passe en vertical avec sous-titres et on les publie comme ceux d'un stream."], ["Faut-il envoyer la vidéo complète ?", "Chez streamlogics, un lien public (Twitch, Kick, YouTube, Drive ou Dropbox) et la partie à traiter suffisent."]] },
  },
  "elegir-editor": {
    es: { slug: "como-elegir-un-servicio-de-clips", t: "Cómo elegir un servicio de edición de clips (y qué preguntar antes de contratar)", d: "Checklist para comparar editores y agencias de clips cortos: calidad, plazos, derechos, revisiones y precio.",
      sum: "Antes de contratar a un editor o agencia de clips, comprueba quién edita realmente cada clip, qué plazo da, qué incluye el precio (cantidad, subtítulos, formatos), cómo trata tus archivos y si el pago es único o suscripción.",
      s: [["Qué revisar", ["¿Lo edita una persona o es automático? Pide ejemplos reales de clips ya hechos.", "Plazo de entrega claro, por escrito.", "Cuántos clips incluye el precio y de cuántos minutos de video.", "Subtítulos, tu nombre en pantalla y formato vertical u horizontal: ¿están incluidos?", "Pago único o suscripción: elige lo que encaje con tu ritmo de publicación.", "Qué pasa con tus videos: dónde se guardan y cuándo se borran.", "Cómo reclamar si algo sale mal."]],
        ["Señales de alerta", ["Prometen viralidad o un número de vistas: nadie puede garantizarlo.", "No muestran ejemplos ni explican quién edita.", "Piden contraseñas de tus cuentas (no hace falta; basta un link público)."]],
        ["Cómo trabaja streamlogics", ["Pago único por paquete, sin suscripción. Envías el link de un video público y la parte que quieres trabajar. Una persona elige, edita y revisa cada clip, y lo recibes por correo. Los paquetes y precios actuales están en la web."]]],
      q: [["¿Qué incluye normalmente un paquete de clips?", "Una cantidad de clips verticales con subtítulos y un plazo de entrega; lo demás (nombre en pantalla, formato horizontal, revisiones) depende del servicio."], ["¿Conviene pagar por clip o por paquete?", "Un paquete suele dar un precio por clip más bajo y un plazo definido; pagar por clip sirve para probar con poco."], ["¿Garantizan que el clip se haga viral?", "Nadie serio puede garantizarlo. Lo que sí se puede asegurar es calidad de edición, plazo y trato."]] },
    en: { slug: "how-to-choose-a-clip-editing-service", t: "How to choose a clip editing service (and what to ask before you hire)", d: "A checklist to compare short-form clip editors and agencies: quality, turnaround, rights, revisions and price.",
      sum: "Before hiring a clip editor or agency, check who actually edits each clip, the turnaround, what the price includes (quantity, captions, formats), how your files are handled and whether payment is one-time or a subscription.",
      s: [["What to check", ["Is it edited by a person or automatic? Ask for real examples of finished clips.", "A clear turnaround time, in writing.", "How many clips the price includes and from how many minutes of video.", "Captions, your name on screen and vertical or horizontal format: are they included?", "One-time payment or subscription: pick what fits your posting rhythm.", "What happens to your videos: where they are stored and when they are deleted.", "How to complain if something goes wrong."]],
        ["Red flags", ["They promise virality or a view count: nobody can guarantee that.", "No examples and no explanation of who edits.", "They ask for your account passwords (not needed; a public link is enough)."]],
        ["How streamlogics works", ["One-time payment per package, no subscription. You send a public video link and the part you want worked on. A person picks, edits and reviews each clip, and you receive it by email. Current packages and prices are on the website."]]],
      q: [["What does a clip package usually include?", "A number of vertical clips with captions and a delivery time; the rest (name on screen, horizontal format, revisions) depends on the service."], ["Is it better to pay per clip or per package?", "A package usually gives a lower price per clip and a set turnaround; paying per clip is good for trying with a small order."], ["Do they guarantee the clip will go viral?", "No serious service can. What can be promised is edit quality, turnaround and good treatment."]] },
    pt: { slug: "como-escolher-um-servico-de-clipes", t: "Como escolher um serviço de edição de clipes (e o que perguntar antes de contratar)", d: "Checklist para comparar editores e agências de clipes curtos: qualidade, prazos, direitos, revisões e preço.",
      sum: "Antes de contratar um editor ou agência de clipes, confira quem realmente edita cada clipe, o prazo, o que o preço inclui (quantidade, legendas, formatos), como seus arquivos são tratados e se o pagamento é único ou assinatura.",
      s: [["O que conferir", ["Quem edita é uma pessoa ou é automático? Peça exemplos reais de clipes prontos.", "Prazo de entrega claro, por escrito.", "Quantos clipes o preço inclui e de quantos minutos de vídeo.", "Legendas, seu nome na tela e formato vertical ou horizontal: estão incluídos?", "Pagamento único ou assinatura: escolha o que combina com seu ritmo de postagem.", "O que acontece com seus vídeos: onde ficam e quando são apagados.", "Como reclamar se algo der errado."]],
        ["Sinais de alerta", ["Prometem viralizar ou um número de views: ninguém pode garantir.", "Não mostram exemplos nem explicam quem edita.", "Pedem senhas das suas contas (não precisa; um link público basta)."]],
        ["Como a streamlogics trabalha", ["Pagamento único por pacote, sem assinatura. Você envia o link de um vídeo público e a parte que quer trabalhar. Uma pessoa escolhe, edita e revisa cada clipe, e você recebe por e-mail. Pacotes e preços atuais estão no site."]]],
      q: [["O que um pacote de clipes costuma incluir?", "Uma quantidade de clipes verticais com legendas e um prazo de entrega; o resto (nome na tela, formato horizontal, revisões) depende do serviço."], ["Vale mais pagar por clipe ou por pacote?", "O pacote costuma dar preço menor por clipe e prazo definido; pagar por clipe serve para testar com pouco."], ["Garantem que o clipe vai viralizar?", "Nenhum serviço sério pode garantir. Dá para prometer qualidade de edição, prazo e bom atendimento."]] },
    fr: { slug: "comment-choisir-un-service-de-montage-de-clips", t: "Comment choisir un service de montage de clips (et quoi demander avant d'embaucher)", d: "Checklist pour comparer éditeurs et agences de clips courts : qualité, délais, droits, révisions et prix.",
      sum: "Avant d'engager un monteur ou une agence de clips, vérifiez qui monte réellement chaque clip, le délai, ce que le prix inclut (quantité, sous-titres, formats), le traitement de vos fichiers et si le paiement est unique ou par abonnement.",
      s: [["Ce qu'il faut vérifier", ["Le montage est-il fait par une personne ou automatique ? Demandez de vrais exemples.", "Un délai de livraison clair, par écrit.", "Combien de clips le prix inclut et à partir de combien de minutes de vidéo.", "Sous-titres, votre nom à l'écran, format vertical ou horizontal : inclus ?", "Paiement unique ou abonnement : choisissez selon votre rythme de publication.", "Ce que deviennent vos vidéos : stockage et suppression.", "Comment réclamer en cas de problème."]],
        ["Signaux d'alerte", ["Ils promettent la viralité ou un nombre de vues : personne ne peut le garantir.", "Aucun exemple, aucune explication sur qui monte.", "Ils demandent les mots de passe de vos comptes (inutile ; un lien public suffit)."]],
        ["Comment travaille streamlogics", ["Paiement unique par offre, sans abonnement. Vous envoyez le lien d'une vidéo publique et la partie à traiter. Une personne choisit, monte et relit chaque clip, et vous le recevez par e-mail. Les offres et prix actuels sont sur le site."]]],
      q: [["Que comprend généralement une offre de clips ?", "Un nombre de clips verticaux avec sous-titres et un délai de livraison ; le reste (nom à l'écran, format horizontal, révisions) dépend du service."], ["Vaut-il mieux payer au clip ou à l'offre ?", "L'offre donne souvent un prix par clip plus bas et un délai défini ; payer au clip sert à tester en petit."], ["Garantit-on que le clip devienne viral ?", "Aucun service sérieux ne peut le garantir. On peut promettre la qualité du montage, le délai et un bon suivi."]] },
  },
};
const LANGS = ["es", "en", "pt", "fr"];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const urlOf = (g, l) => `${SITE}/guias/${G[g][l].slug}.html`;

mkdirSync("public/guias", { recursive: true });
const urls = [];
for (const g of Object.keys(G)) for (const l of LANGS) {
  const p = G[g][l], u = urlOf(g, l);
  urls.push(u);
  const alt = LANGS.map((x) => `<link rel="alternate" hreflang="${x}" href="${urlOf(g, x)}">`).join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${urlOf(g, "en")}">`;
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: p.t, description: p.d, inLanguage: l, mainEntityOfPage: u, dateModified: "2026-10-12", author: { "@type": "Organization", name: "streamlogics", url: SITE + "/" }, publisher: { "@type": "Organization", name: "streamlogics", url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/favicon-512.png?v=2" } } },
    { "@type": "FAQPage", mainEntity: p.q.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } ] };
  const body = p.s.map(([h, items]) => `<h2>${esc(h)}</h2>` + (items.length > 1 ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p>${esc(items[0])}</p>`)).join("\n");
  const faq = p.q.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("\n");
  writeFileSync(`public/guias/${p.slug}.html`, `<!DOCTYPE html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.t)} · streamlogics</title>
<meta name="description" content="${esc(p.d)}">
<link rel="canonical" href="${u}">
${alt}
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(p.t)}">
<meta property="og:description" content="${esc(p.d)}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${SITE}/favicon-512.png?v=2">
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--bg:#f4faf7;--fg:#0f2e2b;--mut:#4d7a74;--card:#fff;--br:#cfe3dd;--acc:#12a183}
@media (prefers-color-scheme:dark){:root{--bg:#0e1b19;--fg:#e6f3ef;--mut:#9cc2ba;--card:#14272424;--br:#264641}}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 16px 64px}
a{color:var(--acc)}nav{font-size:15px;margin-bottom:24px}
h1{font-size:clamp(26px,5vw,36px);line-height:1.2;margin:0 0 16px}
h2{font-size:22px;margin:32px 0 8px}h3{font-size:18px;margin:20px 0 4px}
.sum{background:var(--card);border:1px solid var(--br);border-radius:16px;padding:16px 20px}
li{margin:6px 0}.cta{display:inline-block;margin-top:28px;background:var(--acc);color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600}
.by{color:var(--mut);font-size:15px;margin-top:40px}
</style>
</head>
<body>
<main>
<nav><a href="/">${HOME[l]}</a></nav>
<h1>${esc(p.t)}</h1>
<p class="sum">${esc(p.sum)}</p>
${body}
<h2>FAQ</h2>
${faq}
<a class="cta" href="/#pricing">${CTA[l]}</a>
<p class="by">${esc(BY[l])}</p>
</main>
</body>
</html>
`);
}
// Sitemap: se regenera con las guias.
const base = [["/", "1.0"], ["/terminos.html", "0.3"], ["/privacidad.html", "0.3"]];
const loc = (u, pr) => `  <url><loc>${u}</loc><lastmod>2026-10-12</lastmod><priority>${pr}</priority></url>`;
writeFileSync("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${base.map(([p, pr]) => loc(SITE + p, pr)).concat(urls.map((u) => loc(u, "0.6"))).join("\n")}\n</urlset>\n`);
writeFileSync("tools/guias-urls.txt", [SITE + "/", ...urls].join("\n") + "\n");
console.log("guias:", urls.length);
