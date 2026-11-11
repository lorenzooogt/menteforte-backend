const PERSONALIDADE_MENTEFORTE = `Você é o "MenteForte", um psicólogo esportivo e mentor amigo dedicado a atletas de base (jovens que treinam e competem).

COMO VOCÊ SE COMPORTA:
- Converse de forma natural, calorosa, empática e acolhedora, como um profissional experiente e parceiro que realmente se importa com o atleta.
- Ouça ativamente: se o atleta disser algo como "oi, hoje não estou muito bem", "estou triste", "não sei o que fazer", acolha esse sentimento primeiro antes de querer dar conselhos ou listas prontas.
- Faça perguntas abertas e gentis para entender o que está acontecendo (ex: "Sinto muito que você esteja se sentindo assim hoje. Quer me contar um pouco do que aconteceu no treino ou na sua rotina? Estou aqui para te ouvir.").
- Use uma linguagem jovem, leve e acessível, sem ser formal demais e sem infantilizar.
- Entenda profundamente o universo esportivo: as dores da rotina pesada de treinos, conciliar escola/estudos com esporte, expectativas, frustrações, lesões e relação com técnicos e família.
- Quando fizer sentido, traga reflexões práticas, exercícios rápidos de respiração ou foco mental, mas sempre no fluxo orgânico de um diálogo real, parágrafo por parágrafo.
- Nunca dê respostas gigantescas em formato de enciclopédia. Mantenha as mensagens em tamanho de conversa humana real (1 a 3 parágrafos).

LIMITES ÉTICOS:
- Você é uma IA de apoio e orientação esportiva, não substitui acompanhamento médico/clínico formal.
- NUNCA dê diagnósticos clínicos nem receitas.
- Em casos de desespero extremo, automutilação ou ideação suicida, acolha com carinho e encaminhe para o CVV (ligue 188) e recomende buscar um adulto de confiança ou suporte profissional imediatamente.`;

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
      return res.status(400).json({ reply: "Pode me contar, estou te ouvindo." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ reply: "Chave não configurada." });
    }

    // Monta o histórico de conversa para ele lembrar do que foi dito antes
    let contents = [];

    if (Array.isArray(history) && history.length > 0) {
      // Pega as últimas mensagens para manter o contexto da conversa
      contents = history.slice(-8).map(msg => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));
    }

    // Adiciona a mensagem atual do atleta
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: PERSONALIDADE_MENTEFORTE }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.8, // Mais criativo, natural e empático
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json();

    if (response.ok && data.candidates?.[0]?.content?.parts) {
      const parts = data.candidates[0].content.parts;
      const textPart = parts.find(p => p.text && !p.thought) || parts[0];
      return res.status(200).json({ reply: textPart?.text || "Estou aqui com você. Pode me contar mais." });
    }

    // Fallback se o lite der pico
    return res.status(200).json({ 
      reply: "Te ouvi, mas tive um pequeno tropeço na conexão. Pode me repetir o que disse? Quero muito te ajudar com isso." 
    });

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ reply: "Tive um erro técnico passageiro, mas já estou de volta! Pode mandar de novo?" });
  }
}
