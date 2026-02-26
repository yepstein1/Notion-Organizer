// Notion API service for creating and updating pages

const NOTION_API_VERSION = '2022-06-28';

export const notionAPI = {
  // Test connection to Notion
  async testConnection(token, databaseId) {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION
      }
    });

    return response.ok;
  },

  // Search for existing page by title
  async findPageByTitle(token, databaseId, title) {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          property: 'Name',
          title: {
            equals: title
          }
        }
      })
    });

    const data = await response.json();
    return data.results && data.results.length > 0 ? data.results[0] : null;
  },

  // Build content blocks from sections
  buildContentBlocks(sections) {
    const blocks = [];
    
    for (const section of sections) {
      // Add heading
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

      // Add bulleted list
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
  },

  // Append content to existing page
  async appendToPage(token, pageId, contentBlocks) {
    await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        children: [
          {
            object: 'block',
            type: 'divider',
            divider: {}
          },
          ...contentBlocks
        ]
      })
    });
  },

  // Create new page
  async createPage(token, databaseId, topic, tags, contentBlocks) {
    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{
              text: { content: topic }
            }]
          },
          Tags: {
            multi_select: tags.map(tag => ({ name: tag }))
          }
        },
        children: contentBlocks
      })
    });
  },

  // Create or update page
  async createOrUpdatePage(token, databaseId, pageData) {
    const contentBlocks = this.buildContentBlocks(pageData.sections);
    const existingPage = await this.findPageByTitle(token, databaseId, pageData.topic);

    if (existingPage) {
      await this.appendToPage(token, existingPage.id, contentBlocks);
      return { action: 'updated', topic: pageData.topic };
    } else {
      await this.createPage(token, databaseId, pageData.topic, pageData.tags, contentBlocks);
      return { action: 'created', topic: pageData.topic };
    }
  }
};
