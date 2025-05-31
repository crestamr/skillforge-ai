// SkillForge AI MongoDB Schema Design
// Created: 2025-05-31
// Description: MongoDB collections for unstructured data storage

// ================================
// Database and Collection Setup
// ================================

// Use SkillForge AI database
use('skillforge_db');

// ================================
// User Portfolios Collection
// ================================
// Stores user project portfolios with analysis results
db.createCollection('user_portfolios', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'UUID of the user (references PostgreSQL users table)'
        },
        projects: {
          bsonType: 'array',
          description: 'Array of user projects',
          items: {
            bsonType: 'object',
            required: ['title', 'description'],
            properties: {
              title: {
                bsonType: 'string',
                description: 'Project title'
              },
              description: {
                bsonType: 'string',
                description: 'Project description'
              },
              screenshots: {
                bsonType: 'array',
                description: 'Array of screenshot URLs',
                items: {
                  bsonType: 'string'
                }
              },
              technologies: {
                bsonType: 'array',
                description: 'Technologies used in the project',
                items: {
                  bsonType: 'string'
                }
              },
              url: {
                bsonType: 'string',
                description: 'Project URL or repository link'
              },
              github_url: {
                bsonType: 'string',
                description: 'GitHub repository URL'
              },
              demo_url: {
                bsonType: 'string',
                description: 'Live demo URL'
              },
              analysis_results: {
                bsonType: 'object',
                description: 'AI analysis results of the project',
                properties: {
                  visual_analysis: {
                    bsonType: 'object',
                    description: 'CLIP visual analysis results'
                  },
                  code_analysis: {
                    bsonType: 'object',
                    description: 'Code quality and complexity analysis'
                  },
                  skill_extraction: {
                    bsonType: 'array',
                    description: 'Skills identified from the project',
                    items: {
                      bsonType: 'object',
                      properties: {
                        skill_name: { bsonType: 'string' },
                        confidence: { bsonType: 'double' },
                        evidence: { bsonType: 'string' }
                      }
                    }
                  },
                  complexity_score: {
                    bsonType: 'double',
                    minimum: 0,
                    maximum: 10,
                    description: 'Project complexity score (0-10)'
                  },
                  quality_score: {
                    bsonType: 'double',
                    minimum: 0,
                    maximum: 10,
                    description: 'Project quality score (0-10)'
                  }
                }
              },
              created_at: {
                bsonType: 'date',
                description: 'Project creation date'
              },
              updated_at: {
                bsonType: 'date',
                description: 'Project last update date'
              }
            }
          }
        },
        portfolio_summary: {
          bsonType: 'object',
          description: 'Overall portfolio analysis',
          properties: {
            total_projects: { bsonType: 'int' },
            primary_technologies: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            experience_level: {
              bsonType: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert']
            },
            portfolio_strength: {
              bsonType: 'double',
              minimum: 0,
              maximum: 10
            },
            recommendations: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            }
          }
        },
        created_at: {
          bsonType: 'date',
          description: 'Portfolio creation timestamp'
        },
        updated_at: {
          bsonType: 'date',
          description: 'Portfolio last update timestamp'
        }
      }
    }
  }
});

// ================================
// Resume Analysis Collection
// ================================
// Stores parsed resume data and analysis results
db.createCollection('resume_analysis', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'resume_url', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'UUID of the user'
        },
        resume_url: {
          bsonType: 'string',
          description: 'URL or path to the resume file'
        },
        file_metadata: {
          bsonType: 'object',
          properties: {
            filename: { bsonType: 'string' },
            file_size: { bsonType: 'long' },
            file_type: { bsonType: 'string' },
            upload_date: { bsonType: 'date' }
          }
        },
        parsed_sections: {
          bsonType: 'object',
          description: 'Structured resume sections',
          properties: {
            contact_info: {
              bsonType: 'object',
              properties: {
                name: { bsonType: 'string' },
                email: { bsonType: 'string' },
                phone: { bsonType: 'string' },
                location: { bsonType: 'string' },
                linkedin: { bsonType: 'string' },
                github: { bsonType: 'string' },
                website: { bsonType: 'string' }
              }
            },
            summary: {
              bsonType: 'string',
              description: 'Professional summary or objective'
            },
            experience: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  company: { bsonType: 'string' },
                  position: { bsonType: 'string' },
                  start_date: { bsonType: 'string' },
                  end_date: { bsonType: 'string' },
                  description: { bsonType: 'string' },
                  achievements: {
                    bsonType: 'array',
                    items: { bsonType: 'string' }
                  },
                  technologies: {
                    bsonType: 'array',
                    items: { bsonType: 'string' }
                  }
                }
              }
            },
            education: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  institution: { bsonType: 'string' },
                  degree: { bsonType: 'string' },
                  field_of_study: { bsonType: 'string' },
                  graduation_date: { bsonType: 'string' },
                  gpa: { bsonType: 'string' }
                }
              }
            },
            skills: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            certifications: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  name: { bsonType: 'string' },
                  issuer: { bsonType: 'string' },
                  date: { bsonType: 'string' },
                  expiry_date: { bsonType: 'string' }
                }
              }
            },
            projects: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  name: { bsonType: 'string' },
                  description: { bsonType: 'string' },
                  technologies: {
                    bsonType: 'array',
                    items: { bsonType: 'string' }
                  }
                }
              }
            }
          }
        },
        skills_extracted: {
          bsonType: 'array',
          description: 'Skills identified from resume with confidence scores',
          items: {
            bsonType: 'object',
            properties: {
              skill_name: { bsonType: 'string' },
              category: { bsonType: 'string' },
              confidence: { bsonType: 'double' },
              source_section: { bsonType: 'string' },
              context: { bsonType: 'string' }
            }
          }
        },
        experience_analysis: {
          bsonType: 'object',
          properties: {
            total_years: { bsonType: 'double' },
            years_by_role: {
              bsonType: 'object',
              description: 'Years of experience by job role'
            },
            years_by_technology: {
              bsonType: 'object',
              description: 'Years of experience by technology'
            },
            career_progression: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  level: { bsonType: 'string' },
                  years: { bsonType: 'double' }
                }
              }
            }
          }
        },
        recommendations: {
          bsonType: 'array',
          description: 'AI-generated recommendations for resume improvement',
          items: {
            bsonType: 'object',
            properties: {
              category: { bsonType: 'string' },
              suggestion: { bsonType: 'string' },
              priority: { bsonType: 'string' },
              impact: { bsonType: 'string' }
            }
          }
        },
        analysis_metadata: {
          bsonType: 'object',
          properties: {
            processing_time: { bsonType: 'double' },
            model_version: { bsonType: 'string' },
            confidence_score: { bsonType: 'double' },
            errors: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            }
          }
        },
        created_at: {
          bsonType: 'date',
          description: 'Analysis creation timestamp'
        },
        updated_at: {
          bsonType: 'date',
          description: 'Analysis last update timestamp'
        }
      }
    }
  }
});

// Create indexes for user portfolios
db.user_portfolios.createIndex({ "user_id": 1 });
db.user_portfolios.createIndex({ "created_at": -1 });
db.user_portfolios.createIndex({ "projects.technologies": 1 });
db.user_portfolios.createIndex({ "portfolio_summary.primary_technologies": 1 });

// Create indexes for resume analysis
db.resume_analysis.createIndex({ "user_id": 1 });
db.resume_analysis.createIndex({ "created_at": -1 });
db.resume_analysis.createIndex({ "skills_extracted.skill_name": 1 });
db.resume_analysis.createIndex({ "parsed_sections.experience.company": 1 });
db.resume_analysis.createIndex({ "parsed_sections.experience.position": 1 });

// ================================
// User Generated Content Collection
// ================================
// Stores user-created content like posts, articles, comments
db.createCollection('user_generated_content', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'content_type', 'content', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'UUID of the user'
        },
        content_type: {
          bsonType: 'string',
          enum: ['post', 'article', 'comment', 'question', 'answer', 'review'],
          description: 'Type of content'
        },
        content: {
          bsonType: 'string',
          description: 'The actual content text'
        },
        title: {
          bsonType: 'string',
          description: 'Content title (for posts and articles)'
        },
        tags: {
          bsonType: 'array',
          items: { bsonType: 'string' },
          description: 'Content tags for categorization'
        },
        metadata: {
          bsonType: 'object',
          properties: {
            word_count: { bsonType: 'int' },
            reading_time: { bsonType: 'int' },
            language: { bsonType: 'string' },
            sentiment_score: { bsonType: 'double' },
            topics: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            }
          }
        },
        visibility: {
          bsonType: 'string',
          enum: ['public', 'private', 'followers', 'connections'],
          default: 'public'
        },
        engagement: {
          bsonType: 'object',
          properties: {
            views: { bsonType: 'long', minimum: 0 },
            likes: { bsonType: 'long', minimum: 0 },
            shares: { bsonType: 'long', minimum: 0 },
            comments: { bsonType: 'long', minimum: 0 }
          }
        },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' }
      }
    }
  }
});

// ================================
// AI Coaching Conversations Collection
// ================================
// Stores conversation history with AI career coach
db.createCollection('ai_coaching_conversations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'UUID of the user'
        },
        session_id: {
          bsonType: 'string',
          description: 'Unique session identifier'
        },
        messages: {
          bsonType: 'array',
          description: 'Conversation messages',
          items: {
            bsonType: 'object',
            required: ['role', 'content', 'timestamp'],
            properties: {
              role: {
                bsonType: 'string',
                enum: ['user', 'assistant', 'system'],
                description: 'Message sender role'
              },
              content: {
                bsonType: 'string',
                description: 'Message content'
              },
              timestamp: {
                bsonType: 'date',
                description: 'Message timestamp'
              },
              metadata: {
                bsonType: 'object',
                properties: {
                  intent: { bsonType: 'string' },
                  confidence: { bsonType: 'double' },
                  entities: {
                    bsonType: 'array',
                    items: {
                      bsonType: 'object',
                      properties: {
                        type: { bsonType: 'string' },
                        value: { bsonType: 'string' },
                        confidence: { bsonType: 'double' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        context: {
          bsonType: 'object',
          description: 'Conversation context and state',
          properties: {
            topic: { bsonType: 'string' },
            user_goals: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            current_focus: { bsonType: 'string' },
            conversation_stage: {
              bsonType: 'string',
              enum: ['introduction', 'assessment', 'planning', 'guidance', 'follow_up']
            },
            user_profile_snapshot: {
              bsonType: 'object',
              description: 'User profile at time of conversation'
            }
          }
        },
        summary: {
          bsonType: 'object',
          properties: {
            key_topics: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            insights: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            recommendations_given: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            user_sentiment: { bsonType: 'string' },
            conversation_quality: { bsonType: 'double' }
          }
        },
        action_items: {
          bsonType: 'array',
          description: 'Action items extracted from conversation',
          items: {
            bsonType: 'object',
            properties: {
              task: { bsonType: 'string' },
              priority: { bsonType: 'string' },
              due_date: { bsonType: 'date' },
              status: {
                bsonType: 'string',
                enum: ['pending', 'in_progress', 'completed', 'cancelled']
              }
            }
          }
        },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' },
        ended_at: { bsonType: 'date' }
      }
    }
  }
});

// ================================
// Market Intelligence Collection
// ================================
// Stores processed market data and insights
db.createCollection('market_intelligence', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['category', 'timestamp'],
      properties: {
        category: {
          bsonType: 'string',
          enum: ['job_trends', 'salary_data', 'skill_demand', 'industry_news', 'company_insights'],
          description: 'Type of market intelligence'
        },
        raw_data: {
          bsonType: 'object',
          description: 'Raw data from various sources'
        },
        processed_insights: {
          bsonType: 'object',
          description: 'Processed and analyzed insights',
          properties: {
            trends: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  trend: { bsonType: 'string' },
                  direction: { bsonType: 'string' },
                  confidence: { bsonType: 'double' },
                  impact: { bsonType: 'string' }
                }
              }
            },
            predictions: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  prediction: { bsonType: 'string' },
                  timeframe: { bsonType: 'string' },
                  probability: { bsonType: 'double' }
                }
              }
            },
            key_metrics: {
              bsonType: 'object',
              description: 'Important metrics and KPIs'
            }
          }
        },
        sources: {
          bsonType: 'array',
          description: 'Data sources used',
          items: {
            bsonType: 'object',
            properties: {
              name: { bsonType: 'string' },
              url: { bsonType: 'string' },
              reliability_score: { bsonType: 'double' },
              last_updated: { bsonType: 'date' }
            }
          }
        },
        geographic_scope: {
          bsonType: 'array',
          items: { bsonType: 'string' },
          description: 'Geographic regions covered'
        },
        industry_scope: {
          bsonType: 'array',
          items: { bsonType: 'string' },
          description: 'Industries covered'
        },
        timestamp: { bsonType: 'date' },
        validity_period: {
          bsonType: 'object',
          properties: {
            start: { bsonType: 'date' },
            end: { bsonType: 'date' }
          }
        },
        confidence_score: {
          bsonType: 'double',
          minimum: 0,
          maximum: 1,
          description: 'Overall confidence in the intelligence'
        }
      }
    }
  }
});

// Create indexes for user generated content
db.user_generated_content.createIndex({ "user_id": 1 });
db.user_generated_content.createIndex({ "content_type": 1 });
db.user_generated_content.createIndex({ "created_at": -1 });
db.user_generated_content.createIndex({ "tags": 1 });
db.user_generated_content.createIndex({ "visibility": 1 });

// Create indexes for AI coaching conversations
db.ai_coaching_conversations.createIndex({ "user_id": 1 });
db.ai_coaching_conversations.createIndex({ "session_id": 1 });
db.ai_coaching_conversations.createIndex({ "created_at": -1 });
db.ai_coaching_conversations.createIndex({ "context.topic": 1 });
db.ai_coaching_conversations.createIndex({ "messages.timestamp": -1 });

// Create indexes for market intelligence
db.market_intelligence.createIndex({ "category": 1 });
db.market_intelligence.createIndex({ "timestamp": -1 });
db.market_intelligence.createIndex({ "geographic_scope": 1 });
db.market_intelligence.createIndex({ "industry_scope": 1 });
db.market_intelligence.createIndex({ "validity_period.end": 1 });

// Create TTL index for market intelligence (expire after validity period)
db.market_intelligence.createIndex(
  { "validity_period.end": 1 },
  { expireAfterSeconds: 0 }
);

print("MongoDB schema for SkillForge AI created successfully!");
print("Collections created: user_portfolios, resume_analysis, user_generated_content, ai_coaching_conversations, market_intelligence");
print("Indexes created for optimal query performance");
print("Validation rules applied for data integrity");
print("TTL indexes configured for automatic data expiration");
