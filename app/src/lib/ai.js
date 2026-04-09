// AI Service — Uses Google Gemini API for real AI-powered content generation
// Falls back to local smart extraction when no API key is provided

import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

export function setApiKey(key) {
  if (key && key.trim()) {
    genAI = new GoogleGenerativeAI(key.trim());
    localStorage.setItem('vantage_gemini_key', key.trim());
    return true;
  }
  return false;
}

export function getStoredKey() {
  return localStorage.getItem('vantage_gemini_key') || '';
}

export function hasAI() {
  return !!genAI;
}

// Initialize from stored key on load
const stored = getStoredKey();
if (stored) setApiKey(stored);

export async function generateWithAI(text) {
  if (!genAI) return generateLocally(text);

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: "You are an expert Harvard-level instructional designer and curriculum developer. Your goal is to deeply analyze provided study materials and extract highly rigorous, conceptually sound questions. Do not test trivial formatting. Do not hallucinate. All questions must rely entirely on the provided text. Distractors in MCQs must be highly plausible. Ensure rigorous academic quality.",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    // Smart chunking: Try to cut at the last period instead of mid-word if very long
    let safeText = text.length > 25000 ? text.substring(0, 25000) : text;
    if (text.length > 25000) {
      const lastPeriod = safeText.lastIndexOf('.');
      if (lastPeriod > 20000) safeText = safeText.substring(0, lastPeriod + 1);
    }

    const prompt = `Perform a comprehensive cognitive analysis of the following study material. Extract the core scientific, technical, historical, or conceptual knowledge.

Return ONLY a JSON dictionary matching this exact schema:
{
  "flashcards": [
    {"front": "A specific, unambiguous question testing a core concept", "back": "The precise, factual answer"}
  ],
  "quizQuestions": [
    {"type": "mcq", "question": "Clear conceptual question", "options": ["Valid A", "Plausible B", "Plausible C", "Plausible D"], "correct": "The exact string of the correct option"},
    {"type": "truefalse", "question": "A factual statement that is definitively true or false based exclusively on the text", "options": ["True","False"], "correct": "True or False"}
  ],
  "lessons": [
    {"title": "Lesson Section Title", "content": "A detailed, academically structured breakdown of the concepts", "keyTerms": ["term1", "term2"]}
  ]
}

Rules:
1. ONLY generate questions that are explicitly supported by the text.
2. Generate 15 to 25 flashcards targeting high-yield concepts.
3. Generate 12 to 18 quiz questions. Ensure MCQ distractors are plausible and test genuine understanding.
4. Generate 5 to 8 lesson modules logically summarizing the text.
5. Do NOT test metadata (e.g. "What does paragraph 2 say?", "Who is the author?"). Test the actual subject matter.
6. Return purely the JSON dictionary.

STUDY MATERIAL:
---
${safeText}
---`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    return {
      flashcards: (data.flashcards || []).map(fc => ({
        ...fc,
        id: crypto.randomUUID(),
        difficulty: 0, nextReview: Date.now(), interval: 1,
        easeFactor: 2.5, status: 'new'
      })),
      quizQuestions: (data.quizQuestions || []).map(q => ({
        ...q,
        id: crypto.randomUUID()
      })),
      lessons: data.lessons || [],
      aiGenerated: true,
    };
  } catch (err) {
    console.error('AI generation failed, falling back to local:', err);
    return generateLocally(text);
  }
}

// Local fallback — smart text analysis without AI
export function generateLocally(text) {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15 && s.length < 300);
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 30);

  const flashcards = [];
  const usedSentences = new Set();
  const keyTermPatterns = [
    /(?:^|\s)(\w[\w\s]{2,30})\s+(?:is|are|was|were|means|refers to|defined as|describes|involves)\s+(.{15,200})/gi,
    /(?:^|\s)(?:The\s+)?(\w[\w\s]{2,30})\s*(?:—|–|-|:)\s*(.{15,200})/gi,
  ];

  for (const sent of sentences) {
    if (flashcards.length >= 30) break;
    for (const pattern of keyTermPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(sent);
      if (match && !usedSentences.has(sent)) {
        usedSentences.add(sent);
        flashcards.push({
          id: crypto.randomUUID(),
          front: `What is ${match[1].trim()}?`,
          back: match[2].trim().replace(/^[,.\s]+/, ''),
          difficulty: 0, nextReview: Date.now(), interval: 1,
          easeFactor: 2.5, status: 'new'
        });
        break;
      }
    }
  }

  const remaining = sentences.filter(s => !usedSentences.has(s));
  for (let i = 0; i < remaining.length && flashcards.length < 30; i++) {
    const words = remaining[i].split(/\s+/);
    if (words.length >= 6) {
      const sigWords = words.filter(w => w.length > 4 && !/^(about|which|their|there|these|those|would|could|should|where|while|after|before|being|other|every|under|still|might|first|since)$/i.test(w));
      if (sigWords.length > 0) {
        const blank = sigWords[Math.floor(Math.random() * sigWords.length)];
        const cleaned = blank.replace(/[^a-zA-Z0-9]/g, '');
        if (cleaned.length > 3) {
          flashcards.push({
            id: crypto.randomUUID(),
            front: remaining[i].replace(blank, '_____'),
            back: cleaned,
            difficulty: 0, nextReview: Date.now(), interval: 1,
            easeFactor: 2.5, status: 'new'
          });
          usedSentences.add(remaining[i]);
        }
      }
    }
  }

  const leftover = sentences.filter(s => !usedSentences.has(s));
  for (let i = 0; i < leftover.length && flashcards.length < 30; i += 2) {
    if (leftover[i]) {
      flashcards.push({
        id: crypto.randomUUID(),
        front: leftover[i].length > 80 ? leftover[i].substring(0, 80) + '...' : leftover[i],
        back: leftover[i],
        difficulty: 0, nextReview: Date.now(), interval: 1,
        easeFactor: 2.5, status: 'new'
      });
    }
  }

  const quizQuestions = [];
  for (let i = 0; i < Math.min(flashcards.length, 15); i++) {
    const card = flashcards[i];
    const wrongs = flashcards.filter(c => c.id !== card.id).sort(() => Math.random() - 0.5).slice(0, 3).map(c => c.back.length > 60 ? c.back.substring(0, 60) : c.back);
    if (wrongs.length >= 2) {
      const correct = card.back.length > 60 ? card.back.substring(0, 60) : card.back;
      quizQuestions.push({
        id: crypto.randomUUID(), type: 'mcq', question: card.front,
        options: [...wrongs.slice(0, 3), correct].sort(() => Math.random() - 0.5),
        correct
      });
    }
  }
  for (let i = 0; i < Math.min(sentences.length, 6); i++) {
    const isTrue = Math.random() > 0.4;
    let stmt = sentences[i];
    if (!isTrue && sentences.length > i + 5) {
      const w = stmt.split(' ');
      if (w.length > 4) { const idx = Math.floor(w.length / 2); const sw = sentences[i+3]?.split(' ') || []; if (sw.length > idx) { w[idx] = sw[idx] || w[idx]; stmt = w.join(' '); } }
    }
    quizQuestions.push({ id: crypto.randomUUID(), type: 'truefalse', question: stmt, correct: isTrue ? 'True' : 'False', options: ['True', 'False'] });
  }

  const lessons = [];
  for (let i = 0; i < paragraphs.length && lessons.length < 8; i++) {
    if (paragraphs[i].length > 50) {
      const titleMatch = paragraphs[i].match(/^(.{5,60}?)(?:\.|:|\n)/);
      const words = paragraphs[i].split(/\s+/);
      const kts = [...new Set(words.filter(w => { const c = w.replace(/[^a-zA-Z]/g, ''); return c.length > 5 && c[0] === c[0].toUpperCase() && c[0] !== c[0].toLowerCase(); }))].slice(0, 6);
      lessons.push({
        title: titleMatch ? titleMatch[1].trim() : `Section ${lessons.length + 1}`,
        content: paragraphs[i],
        keyTerms: kts,
      });
    }
  }

  return { flashcards, quizQuestions, lessons, aiGenerated: false };
}
