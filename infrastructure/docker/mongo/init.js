// MongoDB Initialization Script for SkillForge AI
// This script sets up the initial database structure and configurations

// Switch to the skillforge database
db = db.getSiblingDB('skillforge_db');

// Create application user with appropriate permissions
db.createUser({
  user: 'skillforge_app',
  pwd: 'skillforge_app_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'skillforge_db'
    }
  ]
});

// Create collections with validation schemas
db.createCollection('user_portfolios', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'User ID is required'
        },
        projects: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              title: { bsonType: 'string' },
              description: { bsonType: 'string' },
              screenshots: { bsonType: 'array' },
              technologies: { bsonType: 'array' },
              url: { bsonType: 'string' },
              analysis_results: { bsonType: 'object' }
            }
          }
        },
        created_at: {
          bsonType: 'date',
          description: 'Creation timestamp is required'
        },
        updated_at: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.createCollection('resume_analysis', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'User ID is required'
        },
        resume_url: {
          bsonType: 'string'
        },
        parsed_sections: {
          bsonType: 'object'
        },
        skills_extracted: {
          bsonType: 'array'
        },
        experience_years: {
          bsonType: 'number'
        },
        education: {
          bsonType: 'array'
        },
        recommendations: {
          bsonType: 'array'
        },
        created_at: {
          bsonType: 'date',
          description: 'Creation timestamp is required'
        }
      }
    }
  }
});

db.createCollection('ai_coaching_conversations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'User ID is required'
        },
        messages: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['role', 'content', 'timestamp'],
            properties: {
              role: {
                bsonType: 'string',
                enum: ['user', 'assistant', 'system']
              },
              content: {
                bsonType: 'string'
              },
              timestamp: {
                bsonType: 'date'
              }
            }
          }
        },
        context: {
          bsonType: 'object'
        },
        summary: {
          bsonType: 'string'
        },
        action_items: {
          bsonType: 'array'
        },
        created_at: {
          bsonType: 'date',
          description: 'Creation timestamp is required'
        },
        updated_at: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.createCollection('market_intelligence', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['category', 'timestamp'],
      properties: {
        category: {
          bsonType: 'string',
          description: 'Category is required'
        },
        raw_data: {
          bsonType: 'object'
        },
        processed_insights: {
          bsonType: 'object'
        },
        sources: {
          bsonType: 'array'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Timestamp is required'
        },
        validity_period: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.createCollection('user_generated_content', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'content_type', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'User ID is required'
        },
        content_type: {
          bsonType: 'string',
          enum: ['post', 'comment', 'review', 'question', 'answer'],
          description: 'Content type is required'
        },
        content: {
          bsonType: 'string'
        },
        metadata: {
          bsonType: 'object'
        },
        visibility: {
          bsonType: 'string',
          enum: ['public', 'private', 'friends'],
          default: 'public'
        },
        created_at: {
          bsonType: 'date',
          description: 'Creation timestamp is required'
        },
        updated_at: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Create indexes for performance
db.user_portfolios.createIndex({ 'user_id': 1 });
db.user_portfolios.createIndex({ 'created_at': -1 });

db.resume_analysis.createIndex({ 'user_id': 1 });
db.resume_analysis.createIndex({ 'created_at': -1 });

db.ai_coaching_conversations.createIndex({ 'user_id': 1 });
db.ai_coaching_conversations.createIndex({ 'created_at': -1 });
db.ai_coaching_conversations.createIndex({ 'messages.timestamp': -1 });

db.market_intelligence.createIndex({ 'category': 1 });
db.market_intelligence.createIndex({ 'timestamp': -1 });
db.market_intelligence.createIndex({ 'validity_period': 1 });

db.user_generated_content.createIndex({ 'user_id': 1 });
db.user_generated_content.createIndex({ 'content_type': 1 });
db.user_generated_content.createIndex({ 'created_at': -1 });

// Create TTL indexes for data that should expire
db.market_intelligence.createIndex(
  { 'validity_period': 1 },
  { expireAfterSeconds: 0 }
);

// Insert initial health check document
db.health_check.insertOne({
  status: 'initialized',
  timestamp: new Date(),
  database: 'skillforge_db'
});

print('MongoDB initialization completed successfully');
