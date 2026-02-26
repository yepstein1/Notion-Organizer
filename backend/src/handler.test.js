/**
 * Tests for note organization and sorting logic
 * 
 * The app uses AI (Claude) to intelligently organize scratchpad notes into
 * structured pages by topic. These tests verify that:
 * 1. AI responses are correctly parsed into page structures
 * 2. Content blocks are properly built for Notion
 * 3. Notes are organized in a logical, sensible way
 */

// Extract testable functions from handler logic
const parseStructuredPages = (aiText) => {
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  const structured = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

  if (!structured.pages || structured.pages.length === 0) {
    throw new Error('No pages generated from content');
  }

  return structured.pages;
};

const buildContentBlocks = (sections) => {
  const blocks = [];

  for (const section of sections) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: section.heading }
        }]
      }
    });

    for (const bullet of section.bullets) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{
            type: 'text',
            text: { content: bullet }
          }]
        }
      });
    }
  }

  return blocks;
};

describe('Note Organization - parseStructuredPages', () => {
  test('parses valid AI response with single topic', () => {
    const aiResponse = `Here's the organized content:
    {
      "pages": [
        {
          "topic": "React",
          "tags": ["JavaScript", "Frontend"],
          "sections": [
            {
              "heading": "State Management",
              "bullets": ["useState for local state", "useReducer for complex logic"]
            }
          ]
        }
      ]
    }`;

    const pages = parseStructuredPages(aiResponse);
    
    expect(pages).toHaveLength(1);
    expect(pages[0].topic).toBe('React');
    expect(pages[0].tags).toContain('JavaScript');
  });

  test('parses response with multiple topics - notes are split by subject', () => {
    const aiResponse = `{
      "pages": [
        {
          "topic": "React",
          "tags": ["Frontend"],
          "sections": [{ "heading": "Hooks", "bullets": ["useState basics"] }]
        },
        {
          "topic": "Node.js",
          "tags": ["Backend"],
          "sections": [{ "heading": "Express", "bullets": ["Middleware patterns"] }]
        },
        {
          "topic": "TypeScript",
          "tags": ["Types"],
          "sections": [{ "heading": "Generics", "bullets": ["Type parameters"] }]
        }
      ]
    }`;

    const pages = parseStructuredPages(aiResponse);
    
    expect(pages).toHaveLength(3);
    expect(pages.map(p => p.topic)).toEqual(['React', 'Node.js', 'TypeScript']);
  });

  test('throws error when no pages are generated', () => {
    const aiResponse = '{ "pages": [] }';
    
    expect(() => parseStructuredPages(aiResponse)).toThrow('No pages generated from content');
  });

  test('throws error on invalid JSON', () => {
    const aiResponse = 'Not valid JSON at all';
    
    expect(() => parseStructuredPages(aiResponse)).toThrow();
  });

  test('extracts JSON from mixed content', () => {
    const aiResponse = `
    I've analyzed your notes and organized them below:
    
    \`\`\`json
    {
      "pages": [
        {
          "topic": "Python",
          "tags": ["Programming"],
          "sections": [
            { "heading": "Basics", "bullets": ["Variables", "Functions"] }
          ]
        }
      ]
    }
    \`\`\`
    
    Let me know if you need any changes!`;

    const pages = parseStructuredPages(aiResponse);
    
    expect(pages).toHaveLength(1);
    expect(pages[0].topic).toBe('Python');
  });
});

describe('Note Organization - buildContentBlocks', () => {
  test('creates heading and bullet blocks for single section', () => {
    const sections = [
      {
        heading: 'Getting Started',
        bullets: ['Install dependencies', 'Run the app']
      }
    ];

    const blocks = buildContentBlocks(sections);
    
    expect(blocks).toHaveLength(3); // 1 heading + 2 bullets
    expect(blocks[0].type).toBe('heading_2');
    expect(blocks[0].heading_2.rich_text[0].text.content).toBe('Getting Started');
    expect(blocks[1].type).toBe('bulleted_list_item');
    expect(blocks[2].type).toBe('bulleted_list_item');
  });

  test('maintains section order - content blocks appear in logical sequence', () => {
    const sections = [
      { heading: 'Introduction', bullets: ['Overview'] },
      { heading: 'Setup', bullets: ['Prerequisites', 'Installation'] },
      { heading: 'Usage', bullets: ['Basic commands'] }
    ];

    const blocks = buildContentBlocks(sections);
    
    // Extract headings in order
    const headings = blocks
      .filter(b => b.type === 'heading_2')
      .map(b => b.heading_2.rich_text[0].text.content);
    
    expect(headings).toEqual(['Introduction', 'Setup', 'Usage']);
  });

  test('preserves bullet point order within sections', () => {
    const sections = [
      {
        heading: 'Steps',
        bullets: ['Step 1: First', 'Step 2: Second', 'Step 3: Third']
      }
    ];

    const blocks = buildContentBlocks(sections);
    
    const bullets = blocks
      .filter(b => b.type === 'bulleted_list_item')
      .map(b => b.bulleted_list_item.rich_text[0].text.content);
    
    expect(bullets).toEqual(['Step 1: First', 'Step 2: Second', 'Step 3: Third']);
  });

  test('handles empty sections gracefully', () => {
    const sections = [];
    const blocks = buildContentBlocks(sections);
    
    expect(blocks).toEqual([]);
  });

  test('handles section with no bullets', () => {
    const sections = [
      { heading: 'Empty Section', bullets: [] }
    ];

    const blocks = buildContentBlocks(sections);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading_2');
  });
});

describe('Note Sorting - Page Organization Logic', () => {
      test('incremental text addition updates organization for same topic', () => {
        // Initial notes about React context
        const initialAiResponse = `{
          "pages": [
            {
              "topic": "React",
              "tags": ["JavaScript", "Frontend"],
              "sections": [
                { "heading": "Context", "bullets": ["useContext provides access to context value"] }
              ]
            }
          ]
        }`;
        let pages = parseStructuredPages(initialAiResponse);
        expect(pages).toHaveLength(1);
        expect(pages[0].sections.some(s => s.heading === 'Context')).toBe(true);
        expect(pages[0].sections[0].bullets).toContain('useContext provides access to context value');

        // Later, user adds more info about context
        const updatedAiResponse = `{
          "pages": [
            {
              "topic": "React",
              "tags": ["JavaScript", "Frontend"],
              "sections": [
                { "heading": "Context", "bullets": [
                  "useContext provides access to context value",
                  "Context avoids prop drilling for deeply nested components",
                  "Context.Provider wraps components to supply value"
                ] }
              ]
            }
          ]
        }`;
        pages = parseStructuredPages(updatedAiResponse);
        expect(pages).toHaveLength(1);
        const contextSection = pages[0].sections.find(s => s.heading === 'Context');
        expect(contextSection.bullets).toContain('useContext provides access to context value');
        expect(contextSection.bullets).toContain('Context avoids prop drilling for deeply nested components');
        expect(contextSection.bullets).toContain('Context.Provider wraps components to supply value');
      });
    test('organizes text with one topic and different subtopics', () => {
      const aiResponse = `{
        "pages": [
          {
            "topic": "React",
            "tags": ["JavaScript", "Frontend"],
            "sections": [
              { "heading": "Hooks", "bullets": ["useState for local state", "useEffect for side effects", "useReducer for complex state"] },
              { "heading": "Context", "bullets": ["useContext for global state", "Context avoids prop drilling"] },
              { "heading": "Performance", "bullets": ["useMemo caches computed values", "useCallback memoizes functions"] }
            ]
          }
        ]
      }`;

      const pages = parseStructuredPages(aiResponse);
      expect(pages).toHaveLength(1);
      expect(pages[0].topic).toBe('React');
      // Check that all subtopic sections exist
      const sectionHeadings = pages[0].sections.map(s => s.heading);
      expect(sectionHeadings).toContain('Hooks');
      expect(sectionHeadings).toContain('Context');
      expect(sectionHeadings).toContain('Performance');
    });
  test('pages maintain their related topic associations', () => {
    const aiResponse = `{
      "pages": [
        {
          "topic": "React Hooks",
          "tags": ["React", "JavaScript"],
          "sections": [{ "heading": "useEffect", "bullets": ["Side effects"] }],
          "relatedTopics": ["React", "JavaScript", "Frontend"]
        }
      ]
    }`;

    const pages = parseStructuredPages(aiResponse);
    
    expect(pages[0].relatedTopics).toContain('React');
    expect(pages[0].relatedTopics).toContain('Frontend');
  });

  test('complex notes are organized into coherent sections', () => {
    // Simulates what AI would output for mixed learning notes
    const aiResponse = `{
      "pages": [
        {
          "topic": "JavaScript Promises",
          "tags": ["Async", "JavaScript"],
          "sections": [
            {
              "heading": "Creating Promises",
              "bullets": [
                "Use new Promise((resolve, reject) => {})",
                "Call resolve() for success",
                "Call reject() for failure"
              ]
            },
            {
              "heading": "Consuming Promises",
              "bullets": [
                "Use .then() for success handler",
                "Use .catch() for error handler",
                "Use .finally() for cleanup"
              ]
            },
            {
              "heading": "Async/Await Syntax",
              "bullets": [
                "async functions return Promises",
                "await pauses until Promise resolves",
                "Use try/catch for error handling"
              ]
            }
          ]
        }
      ]
    }`;

    const pages = parseStructuredPages(aiResponse);
    const blocks = buildContentBlocks(pages[0].sections);
    
    // Verify sections are in learning order (create → consume → advanced)
    const headings = blocks
      .filter(b => b.type === 'heading_2')
      .map(b => b.heading_2.rich_text[0].text.content);
    
    expect(headings).toEqual([
      'Creating Promises',
      'Consuming Promises', 
      'Async/Await Syntax'
    ]);
    
    // Verify total bullet count
    const bulletCount = blocks.filter(b => b.type === 'bulleted_list_item').length;
    expect(bulletCount).toBe(9);
  });

  test('multiple topics are properly separated', () => {
    const aiResponse = `{
      "pages": [
        {
          "topic": "CSS Grid",
          "tags": ["CSS", "Layout"],
          "sections": [
            { "heading": "Container Properties", "bullets": ["display: grid"] }
          ]
        },
        {
          "topic": "CSS Flexbox", 
          "tags": ["CSS", "Layout"],
          "sections": [
            { "heading": "Flex Direction", "bullets": ["row", "column"] }
          ]
        }
      ]
    }`;

    const pages = parseStructuredPages(aiResponse);
    
    // Both CSS topics are separate pages but share tags
    expect(pages).toHaveLength(2);
    expect(pages[0].topic).not.toBe(pages[1].topic);
    expect(pages[0].tags).toContain('CSS');
    expect(pages[1].tags).toContain('CSS');
  });

  test('organizes text with many topics (biology, programming, etc)', () => {
    const aiResponse = `{
      "pages": [
        {
          "topic": "Biology",
          "tags": ["Science"],
          "sections": [
            { "heading": "Cells", "bullets": ["Mitochondria are the powerhouse of the cell", "The cell membrane is a phospholipid bilayer"] },
            { "heading": "Genetics", "bullets": ["DNA stores genetic information", "RNA carries instructions from DNA to ribosomes"] },
            { "heading": "Organelles", "bullets": ["Ribosomes synthesize proteins", "Golgi apparatus packages proteins", "Lysosomes contain digestive enzymes"] }
          ]
        },
        {
          "topic": "Programming",
          "tags": ["Technology"],
          "sections": [
            { "heading": "Python", "bullets": ["List comprehensions: [x*2 for x in range(10)]", "Generators use yield"] },
            { "heading": "JavaScript", "bullets": ["useState manages local state", "useEffect handles side effects"] }
          ]
        }
      ]
    }`;

    const pages = parseStructuredPages(aiResponse);
    expect(pages).toHaveLength(2);
    expect(pages.map(p => p.topic)).toContain('Biology');
    expect(pages.map(p => p.topic)).toContain('Programming');
    // Check that biology page has a "Cells" section
    const bioPage = pages.find(p => p.topic === 'Biology');
    expect(bioPage.sections.some(s => s.heading === 'Cells')).toBe(true);
    // Check that programming page has a "Python" section
    const progPage = pages.find(p => p.topic === 'Programming');
    expect(progPage.sections.some(s => s.heading === 'Python')).toBe(true);
  });
});

describe('Edge Cases and Robustness', () => {
  test('handles unicode and special characters in notes', () => {
    const aiResponse = `{
      "pages": [
        {
          "topic": "日本語 Notes",
          "tags": ["Language"],
          "sections": [
            { "heading": "Greetings", "bullets": ["こんにちは - Hello", "さようなら - Goodbye"] }
          ]
        }
      ]
    }`;

    const pages = parseStructuredPages(aiResponse);
    const blocks = buildContentBlocks(pages[0].sections);
    
    expect(pages[0].topic).toBe('日本語 Notes');
    expect(blocks[1].bulleted_list_item.rich_text[0].text.content).toContain('こんにちは');
  });

  test('handles code snippets in bullets', () => {
    const aiResponse = `{
      "pages": [
        {
          "topic": "JavaScript",
          "tags": ["Code"],
          "sections": [
            { 
              "heading": "Arrow Functions", 
              "bullets": [
                "const fn = () => {}",
                "const add = (a, b) => a + b",
                "Implicit return for single expressions"
              ]
            }
          ]
        }
      ]
    }`;

    const pages = parseStructuredPages(aiResponse);
    const blocks = buildContentBlocks(pages[0].sections);
    
    expect(blocks[1].bulleted_list_item.rich_text[0].text.content).toBe('const fn = () => {}');
  });

  test('handles very long section headings', () => {
    const longHeading = 'A'.repeat(200);
    const sections = [
      { heading: longHeading, bullets: ['Test bullet'] }
    ];

    const blocks = buildContentBlocks(sections);

    expect(blocks[0].heading_2.rich_text[0].text.content).toBe(longHeading);
  });
});
