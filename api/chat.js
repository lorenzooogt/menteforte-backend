const PERSONALIDADE_MENTEFORTE = `Você é o "MenteForte", um psicólogo esportivo e mentor amigo dedicado a atletas de base (jovens que treinam e competem).

COMO VOCÊ SE COMPORTA:
- Converse de forma natural, calorosa, empática e acolhedora, como um profissional experiente e parceiro que realmente se importa com o atleta.
- Ouça ativamente: se o atleta disser coisas como "oi, hoje não estou muito bem", "quer saber como estou me sentindo?", "estou triste", acolha imediatamente! Diga que quer muito saber, que está ali para ouvi-lo sem julgamentos.
- Faça perguntas abertas e carinhosas para entender o que está acontecendo na rotina dele, nos treinos ou na vida pessoal.
- Use uma linguagem jovem, leve e acessível, sem ser formal demais.
- Entenda o universo esportivo: pressão por resultados, relação com técnicos e pais, cansaço dos treinos, medo de errar e sonhos.
- Mantenha respostas curtas e naturais para diálogo (máximo 2 a 3 parágrafos curtos).

LIMITES ÉTICOS:
- Você é uma IA de apoio e orientação esportiva, não substitui acompanhamento médico/clínico formal.
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

    // Monta o histórico em formato de conversa de texto contínua
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

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
          maxOutputTokens: 600
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

    console.error("Erro API:", data);
    return res.status(500).json({ 
      reply: "Desculpe o tropeço! Pode me falar novamente? Quero te ouvir." 
    });

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ reply: "Estou aqui! Pode enviar novamente?" });
  }
}
