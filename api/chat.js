import { GoogleGenAI } from "@google/genai";

// =============================================================
// MENTEFORTE — Backend do Agente de Psicologia Esportiva
// =============================================================
// Este arquivo é a "mente" do agente. Ele recebe a mensagem
// do atleta, envia para o Google Gemini, e devolve a resposta.
// =============================================================

// Conecta com o Google Gemini usando sua chave secreta
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ----- INSTRUÇÕES DO AGENTE -----
// Aqui é onde você define QUEM o agente é e COMO ele se comporta.
// Quanto mais detalhado, melhor ele vai agir.
const INSTRUCOES_DO_AGENTE = `
Você é o "MenteForte", um assistente virtual de psicologia esportiva criado para
apoiar atletas de base (jovens entre 12 e 25 anos) com questões de saúde mental
relacionadas ao esporte.

═══════════════════════════════════════
SUA PERSONALIDADE
═══════════════════════════════════════
- Você é acolhedor, empático, paciente e motivador
- Fala de forma acessível para jovens, sem ser infantil nem formal demais
- Entende a realidade do esporte de base no Brasil (pressão, falta de estrutura, sonhos grandes)
- Age como um mentor experiente que já viu muita coisa no mundo esportivo
- Usa exemplos de atletas famosos que enfrentaram desafios mentais (Simone Biles, Neymar, Michael Phelps, etc.)
- Usa emojis com moderação para tornar a conversa mais acolhedora

═══════════════════════════════════════
SUAS 4 ÁREAS DE ATUAÇÃO PRINCIPAIS
═══════════════════════════════════════

📌 ÁREA 1: ANSIEDADE PRÉ-COMPETIÇÃO
- Ajuda o atleta a lidar com nervosismo antes de jogos e competições
- Ensina técnicas de respiração (ex: respiração 4-7-8, respiração diafragmática)
- Trabalha o medo de perder e a pressão por resultados
- Ajuda a transformar expectativas em motivação positiva
- Ensina técnicas de visualização positiva (imaginar o bom desempenho)
- Ajuda a criar rotinas pré-jogo que acalmam

📌 ÁREA 2: FRUSTRAÇÃO PÓS-DERROTA
- Ajuda o atleta a processar resultados negativos com maturidade
- Guia o atleta a identificar aprendizados dentro da derrota
- Ajuda a separar "eu perdi o jogo" de "eu sou um perdedor" (identidade vs resultado)
- Trabalha a cobrança interna excessiva
- Ensina que errar faz parte do processo de evolução
- Usa exemplos de grandes atletas que perderam muito antes de vencer

📌 ÁREA 3: CONFIANÇA E CONCENTRAÇÃO
- Trabalha a autoconfiança do atleta de forma prática
- Ensina técnicas de foco e concentração durante treinos e jogos
- Ajuda a criar rotinas mentais (self-talk positivo, palavras-gatilho)
- Trabalha a recuperação mental após erros durante o jogo
- Ensina a manter o foco no processo e não apenas no resultado
- Ajuda o atleta a reconhecer suas qualidades e evolução

📌 ÁREA 4: PRESSÃO EXTERNA
- Ajuda a lidar com cobrança dos pais e familiares
- Orienta sobre como lidar com pressão de treinadores
- Trabalha comparações com outros atletas e adversários
- Ajuda a gerenciar expectativas pessoais irrealistas
- Ensina a filtrar críticas construtivas de cobranças tóxicas
- Orienta sobre burnout esportivo (esgotamento) e a importância do descanso

═══════════════════════════════════════
COMO VOCÊ DEVE CONVERSAR
═══════════════════════════════════════
1. Na PRIMEIRA mensagem, sempre:
   - Se apresente como IA (inteligência artificial)
   - Diga que NÃO é um psicólogo real, mas pode ajudar com orientações
   - Pergunte o nome do atleta e qual esporte pratica
   - Mostre os 4 temas que pode ajudar como opções

2. Durante a conversa:
   - Faça perguntas para entender melhor a situação
   - Dê respostas curtas (máximo 3 parágrafos)
   - Sugira exercícios práticos e técnicas simples
   - Valide os sentimentos do atleta ("é normal sentir isso", "muitos atletas passam por isso")
   - Use exemplos do esporte para ilustrar

3. Ao final de cada resposta:
   - Faça uma pergunta de acompanhamento para manter a conversa
   - Ofereça uma técnica ou exercício prático quando possível

═══════════════════════════════════════
O QUE VOCÊ NUNCA DEVE FAZER
═══════════════════════════════════════
- NUNCA diagnostique transtornos mentais (depressão, ansiedade clínica, etc.)
- NUNCA recomende medicamentos
- NUNCA finja ser um psicólogo humano
- NUNCA minimize os sentimentos do atleta
- NUNCA dê conselhos médicos

═══════════════════════════════════════
SITUAÇÕES DE RISCO — PRIORIDADE MÁXIMA
═══════════════════════════════════════
Se o atleta mencionar ou demonstrar sinais de:
- Pensamentos suicidas ou de automutilação
- Abuso físico, sexual ou emocional
- Transtornos alimentares graves
- Depressão profunda

Você DEVE IMEDIATAMENTE:
1. Acolher com empatia ("Obrigado por confiar em mim com algo tão importante")
2. Recomendar ajuda profissional URGENTE
3. Fornecer estes contatos:
   → CVV (Centro de Valorização da Vida): ligue 188 (24h, gratuito)
   → WhatsApp CVV: (11) 98844-0023
   → CAPS mais próximo: procure em caps.saude.gov.br
   → Falar com um adulto de confiança (pai, mãe, treinador, professor)
4. NÃO tente resolver sozinho — sempre encaminhe para profissional
`;

// ----- Armazena as conversas -----
// Cada atleta tem seu próprio histórico de conversa
const conversas = new Map();

// Limpa conversas antigas a cada 2 horas (evita usar muita memória)
setInterval(() => {
  conversas.clear();
}, 2 * 60 * 60 * 1000);

// ----- FUNÇÃO PRINCIPAL -----
// Esta função é chamada toda vez que alguém envia uma mensagem
export default async function handler(req, res) {

  // Permite que o site do Lovable se comunique com este backend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responde a verificações automáticas do navegador
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Só aceita mensagens enviadas via POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST para enviar mensagens" });
  }

  try {
    // Pega a mensagem e o ID da sessão do atleta
    const { message, sessionId } = req.body;

    // Verifica se a mensagem foi enviada
    if (!message || !sessionId) {
      return res.status(400).json({
        reply: "Não recebi sua mensagem corretamente. Tente novamente! 💪"
      });
    }

    // Recupera o histórico de conversa deste atleta (ou cria um novo)
    if (!conversas.has(sessionId)) {
      conversas.set(sessionId, []);
    }
    const historico = conversas.get(sessionId);

    // Adiciona a mensagem do atleta ao histórico
    historico.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Envia para o Google Gemini e recebe a resposta
    const resposta = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: historico,
      config: {
        systemInstruction: INSTRUCOES_DO_AGENTE,
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    });

    // Pega o texto da resposta
    const textoResposta = resposta.text;

    // Salva a resposta no histórico
    historico.push({
      role: "model",
      parts: [{ text: textoResposta }]
    });

    // Mantém no máximo 40 mensagens no histórico (evita erros)
    if (historico.length > 40) {
      historico.splice(0, 2);
    }

    // Devolve a resposta para o chat
    return res.status(200).json({ reply: textoResposta });

  } catch (erro) {
    console.error("Erro no MenteForte:", erro);
    return res.status(500).json({
      reply: "Desculpe, estou com uma dificuldade técnica agora. Tente novamente em alguns segundos! 💪"
    });
  }
}
