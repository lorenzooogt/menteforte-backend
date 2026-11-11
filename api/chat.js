const INSTRUCOES_DO_AGENTE = `Você é o "MenteForte", um assistente virtual acolhedor de psicologia esportiva para jovens atletas de base (12 a 25 anos).
Você atua em 4 frentes:
1. Ansiedade pré-competição (técnicas de respiração, visualização, controle de nervosismo e medo de errar).
2. Frustração pós-derrota (processar resultados, extrair aprendizados, separar identidade esportiva do resultado).
3. Confiança e concentração (foco, rotinas pré-jogo, autoconfiança, recuperação após falhas).
4. Pressão externa (cobranças familiares, treinadores, expectativas e prevenção de burnout).

Regras obrigatórias:
- Seja sempre empático, acessível e encorajador.
- Dê respostas objetivas (máximo 3 parágrafos curtos).
- NUNCA dê diagnósticos médicos nem receitas.
- Em casos de crise extrema (automutilação, ideação suicida, desespero grave), encaminhe imediatamente para o CVV 188 ou serviços de emergência (192 SAMU).`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(200).json({ status: "Backend MenteForte ativo!" });
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ reply: "Por favor, digite uma mensagem." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ reply: "Erro: Chave GEMINI_API_KEY não encontrada." });
    }

    // Lista de modelos suportados para tentar em ordem
    const modelos = [
      "gemini-2.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    let respostaTexto = null;
    let ultimoErro = null;

    for (const mod of modelos) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${apiKey}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${INSTRUCOES_DO_AGENTE}\n\nMensagem do atleta: ${message}` }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600
            }
          })
        });

        const d = await r.json();
        if (r.ok && d.candidates?.[0]?.content?.parts?.[0]?.text) {
          respostaTexto = d.candidates[0].content.parts[0].text;
          break; // Conseguiu com sucesso!
        } else {
          ultimoErro = d;
        }
      } catch (e) {
        ultimoErro = e;
      }
    }

    if (respostaTexto) {
      return res.status(200).json({ reply: respostaTexto });
    }

    console.error("Erros dos modelos:", JSON.stringify(ultimoErro));
    return res.status(500).json({ 
      reply: "Instabilidade temporária na IA: " + (ultimoErro?.error?.message || "Tente novamente") 
    });

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ reply: "Erro interno. Tente novamente!" });
  }
}
