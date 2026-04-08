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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert educational AI. Analyze the following study material and generate a comprehensive study set.

Return ONLY valid JSON with this exact structure:
{
  "flashcards": [
    {"front": "question text", "back": "answer text"}
  ],
  "quizQuestions": [
    {"type": "mcq", "question": "question text", "options": ["A","B","C","D"], "correct": "the correct option text"},
    {"type": "truefalse", "question": "statement", "options": ["True","False"], "correct": "True or False"}
  ],
  "lessons": [
    {"title": "lesson title", "content": "detailed lesson content explaining the concept clearly", "keyTerms": ["term1","term2"]}
  ]
}

Rules:
- Generate 15-25 flashcards covering key concepts
- Generate 12-18 quiz questions (mix of MCQ and True/False)
- Generate 5-8 detailed lessons breaking down the material like Khan Academy
- Make flashcard questions specific and testable
- Quiz options should be plausible (no obvious wrong answers)
- Lessons should be educational and well-structured with clear explanations
- All content must come from the provided material

STUDY MATERIAL:
${text.substring(0, 15000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) responseText = jsonMatch[1];

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
