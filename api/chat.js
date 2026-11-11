const INSTRUCOES_DO_AGENTE = `Você é o "MenteForte", assistente virtual de psicologia esportiva para jovens atletas de base (12 a 25 anos).
Você atua em 4 frentes:
1. Ansiedade pré-competição (técnicas de respiração, visualização, controle de nervosismo e medo de errar).
2. Frustração pós-derrota (processar resultados, extrair aprendizados, separar identidade esportiva do resultado).
3. Confiança e concentração (foco, rotinas pré-jogo, autoconfiança, recuperação após falhas).
4. Pressão externa (cobranças familiares, treinadores, expectativas e prevenção de burnout).

Regras obrigatórias:
- Seja sempre acolhedor, empático e encorajador.
- Dê respostas objetivas em no máximo 3 parágrafos curtos.
- NUNCA dê diagnósticos médicos nem receitas.
- Em casos de crise extrema (automutilação, ideação suicida), encaminhe para o CVV 188 ou SAMU 192.`;

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
      return res.status(500).json({ reply: "Chave GEMINI_API_KEY não configurada na Vercel." });
    }

    // Modelos leves da sua lista (sem fila/alta demanda)
    const modelosParaTentar = [
      "gemini-2.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ];

    let respostaTexto = null;

    for (const mod of modelosParaTentar) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${INSTRUCOES_DO_AGENTE}\n\nMensagem do atleta: ${message}` }]
              }
            ]
          })
        });

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts) {
          const parts = data.candidates[0].content.parts;
          const textPart = parts.find(p => p.text && !p.thought) || parts[0];
          if (textPart?.text) {
            respostaTexto = textPart.text;
            break; // Sucesso! Sai do loop
          }
        }
      } catch (e) {
        // Se um der erro de demanda, tenta o próximo da lista
      }
    }

    if (respostaTexto) {
      return res.status(200).json({ reply: respostaTexto });
    }

    return res.status(200).json({ 
      reply: "Olá! No momento os servidores estão com bastante movimento, mas estou aqui com você! Respire fundo e tente mandar sua mensagem novamente em alguns instantes. 💪" 
    });

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ reply: "Erro interno. Tente novamente!" });
  }
}
