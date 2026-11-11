const PERSONALIDADE_MENTEFORTE = `Você é o "MenteForte", um psicólogo esportivo e mentor amigo dedicado a atletas de base (jovens que treinam e competem).

COMO VOCÊ SE COMPORTA:
- Converse de forma natural, calorosa, empática e acolhedora, como um profissional experiente e parceiro que realmente se importa com o atleta.
- Ouça ativamente: se o atleta disser coisas como "oi, hoje não estou muito bem", "quer saber como estou me sentindo?", "estou triste", acolha imediatamente! Demonstre interesse real e pergunte o que aconteceu no treino ou no dia a dia.
- Mantenha respostas curtas e humanas para diálogo (máximo 2 a 3 parágrafos curtos).
- Entenda o universo esportivo: pressão por resultados, cobrança de pais e técnicos, cansaço, medo de falhar e paixão pelo esporte.

LIMITES ÉTICOS:
- Você é uma IA de apoio esportivo, não substitui médicos ou psicólogos clínicos.
- NUNCA dê diagnósticos nem receitas.
- Em casos graves ou desespero extremo, acolha e recomende o CVV (188) ou SAMU (192).`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(200).json({ status: "MenteForte pronto!" });
  }

  try {
    const { message, history } = req.body || {};

    if (!message) {
      return res.status(400).json({ reply: "Pode falar, estou te ouvindo!" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ reply: "Chave não configurada." });
    }

    let contextoHistorico = "";
    if (Array.isArray(history) && history.length > 0) {
      contextoHistorico = history
        .slice(-6)
        .map(m => `${m.sender === "user" ? "Atleta" : "MenteForte"}: ${m.text}`)
        .join("\n");
    }

    const promptFinal = `${PERSONALIDADE_MENTEFORTE}

${contextoHistorico ? `Histórico recente da conversa:\n${contextoHistorico}\n` : ""}
Atleta: ${message}
MenteForte:`;

    // O modelo exato exigido pelo Google para a sua conta:
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: promptFinal }]
          }
        ],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json();

    if (response.ok && data.candidates?.[0]?.content?.parts) {
      const parts = data.candidates[0].content.parts;
      const textPart = parts.find(p => p.text && !p.thought) || parts[0];
      if (textPart?.text) {
        return res.status(200).json({ reply: textPart.text.trim() });
      }
    }

    console.error("Erro retornado pelo Google:", data);
    return res.status(500).json({ 
      reply: "Estou aqui! Tive uma oscilação na resposta. Pode falar de novo?" 
    });

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ reply: "Estou aqui! Pode enviar novamente?" });
  }
}
