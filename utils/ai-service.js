// AI service for processing and organizing notes

export const processNotesWithAI = async (scratchpadContent) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are organizing learning notes into a structured knowledge base. 

Take these scratchpad notes and organize them:

${scratchpadContent}

Instructions:
1. Identify the main topic(s) - could be multiple (e.g., "React", "TypeScript", "Node.js")
2. For each topic, organize the content into:
   - Clear section headings that group related concepts
   - Bullet points under each heading
   - Keep it concise and scannable
3. If content relates to multiple topics, split it appropriately

Return JSON format:
{
  "pages": [
    {
      "topic": "React",
      "tags": ["JavaScript", "Frontend", "Hooks"],
      "sections": [
        {
          "heading": "State Management",
          "bullets": [
            "useState manages local component state",
            "useReducer for complex state logic"
          ]
        }
      ],
      "relatedTopics": ["JavaScript", "TypeScript"]
    }
  ]
}

Be intelligent about splitting content. If everything is about one topic, create one page. If mixed, split logically.`
      }]
    })
  });

  const data = await response.json();
  const aiText = data.content.find(b => b.type === "text")?.text || "";
  
  // Parse the structured content
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const structured = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    
    if (!structured.pages || structured.pages.length === 0) {
      throw new Error('No pages generated from content');
    }
    
    return structured;
  } catch (e) {
    throw new Error('Failed to parse AI response');
  }
};
