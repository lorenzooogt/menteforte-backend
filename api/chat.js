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
      return res.status(500).json({ reply: "Erro: Chave GEMINI_API_KEY não configurada." });
    }

    // Endpoint v1 oficial com gemini-2.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: INSTRUCOES_DO_AGENTE }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Erro Gemini:", data);
      return res.status(500).json({ reply: "Erro da IA: " + (data.error?.message || "Instabilidade temporária.") });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Como posso te ajudar no seu treino mental hoje?";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ reply: "Erro interno. Tente novamente!" });
  }
}
