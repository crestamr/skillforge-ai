-- Migration 005: Seed Data
-- Created: 2025-05-31
-- Description: Inserts initial seed data for SkillForge AI

BEGIN;

INSERT INTO schema_migrations (version, description) 
VALUES ('005', 'Initial seed data for skills, learning paths, and assessments')
ON CONFLICT (version) DO NOTHING;

-- Insert initial skills
INSERT INTO skills (name, description, category, level, trending_score, demand_score, salary_impact) VALUES
-- Technical Skills
('Python', 'High-level programming language for web development, data science, and automation', 'technical', 'intermediate', 95.0, 90.0, 15000.00),
('JavaScript', 'Programming language for web development and full-stack applications', 'technical', 'intermediate', 92.0, 95.0, 12000.00),
('React', 'JavaScript library for building user interfaces', 'framework', 'intermediate', 88.0, 85.0, 10000.00),
('Node.js', 'JavaScript runtime for server-side development', 'framework', 'intermediate', 85.0, 80.0, 8000.00),
('PostgreSQL', 'Advanced open-source relational database', 'technical', 'intermediate', 75.0, 70.0, 7000.00),
('Docker', 'Containerization platform for application deployment', 'tool', 'intermediate', 80.0, 75.0, 9000.00),
('AWS', 'Amazon Web Services cloud computing platform', 'tool', 'advanced', 90.0, 88.0, 18000.00),
('Machine Learning', 'AI technique for building predictive models', 'technical', 'advanced', 98.0, 92.0, 25000.00),
('FastAPI', 'Modern Python web framework for building APIs', 'framework', 'intermediate', 85.0, 70.0, 8000.00),
('TypeScript', 'Typed superset of JavaScript', 'technical', 'intermediate', 87.0, 82.0, 9000.00),
('Next.js', 'React framework for production applications', 'framework', 'intermediate', 83.0, 78.0, 9500.00),
('MongoDB', 'NoSQL document database', 'technical', 'intermediate', 72.0, 68.0, 6000.00),
('Redis', 'In-memory data structure store', 'technical', 'intermediate', 70.0, 65.0, 5500.00),
('Kubernetes', 'Container orchestration platform', 'tool', 'advanced', 88.0, 85.0, 16000.00),
('GraphQL', 'Query language for APIs', 'technical', 'intermediate', 75.0, 72.0, 8500.00),

-- Soft Skills
('Communication', 'Ability to convey information effectively', 'soft', 'intermediate', 70.0, 95.0, 5000.00),
('Leadership', 'Ability to guide and motivate teams', 'soft', 'advanced', 75.0, 85.0, 12000.00),
('Problem Solving', 'Analytical thinking and solution development', 'soft', 'intermediate', 80.0, 90.0, 8000.00),
('Project Management', 'Planning and executing projects effectively', 'soft', 'intermediate', 78.0, 88.0, 10000.00),
('Teamwork', 'Collaborative work and team coordination', 'soft', 'intermediate', 65.0, 92.0, 3000.00),
('Critical Thinking', 'Objective analysis and evaluation of issues', 'soft', 'intermediate', 72.0, 87.0, 6000.00),
('Adaptability', 'Flexibility in changing environments', 'soft', 'intermediate', 68.0, 85.0, 4000.00),
('Time Management', 'Efficient use of time and prioritization', 'soft', 'intermediate', 70.0, 88.0, 5000.00),

-- Certifications
('AWS Certified Solutions Architect', 'Professional cloud architecture certification', 'certification', 'advanced', 85.0, 80.0, 15000.00),
('PMP', 'Project Management Professional certification', 'certification', 'advanced', 70.0, 75.0, 12000.00),
('Scrum Master', 'Agile project management certification', 'certification', 'intermediate', 72.0, 78.0, 8000.00),
('Google Cloud Professional', 'Google Cloud Platform certification', 'certification', 'advanced', 82.0, 77.0, 14000.00),
('Certified Kubernetes Administrator', 'Kubernetes administration certification', 'certification', 'advanced', 80.0, 75.0, 13000.00);

-- Create sample learning paths
INSERT INTO learning_paths (title, description, estimated_duration, difficulty, is_featured) VALUES
('Full-Stack Web Development', 'Complete journey from frontend to backend development using modern technologies', 120, 'intermediate', true),
('Data Science Fundamentals', 'Introduction to data analysis, machine learning, and statistical modeling', 80, 'intermediate', true),
('Cloud Architecture Mastery', 'Advanced cloud computing patterns and architecture design', 100, 'advanced', true),
('DevOps Engineering', 'Infrastructure automation, CI/CD, and deployment practices', 90, 'intermediate', false),
('AI/ML Engineering', 'Machine learning model development, training, and deployment', 150, 'advanced', true),
('Frontend Development', 'Modern frontend development with React and TypeScript', 60, 'intermediate', false),
('Backend API Development', 'Building scalable APIs with Python and FastAPI', 70, 'intermediate', false),
('Mobile Development', 'Cross-platform mobile app development', 80, 'intermediate', false);

-- Link skills to learning paths
INSERT INTO learning_path_skills (learning_path_id, skill_id, order_index, required_hours, is_prerequisite) VALUES
-- Full-Stack Web Development
((SELECT id FROM learning_paths WHERE title = 'Full-Stack Web Development'), (SELECT id FROM skills WHERE name = 'JavaScript'), 1, 20, true),
((SELECT id FROM learning_paths WHERE title = 'Full-Stack Web Development'), (SELECT id FROM skills WHERE name = 'React'), 2, 25, false),
((SELECT id FROM learning_paths WHERE title = 'Full-Stack Web Development'), (SELECT id FROM skills WHERE name = 'Node.js'), 3, 20, false),
((SELECT id FROM learning_paths WHERE title = 'Full-Stack Web Development'), (SELECT id FROM skills WHERE name = 'PostgreSQL'), 4, 15, false),
((SELECT id FROM learning_paths WHERE title = 'Full-Stack Web Development'), (SELECT id FROM skills WHERE name = 'TypeScript'), 5, 15, false),

-- Data Science Fundamentals
((SELECT id FROM learning_paths WHERE title = 'Data Science Fundamentals'), (SELECT id FROM skills WHERE name = 'Python'), 1, 25, true),
((SELECT id FROM learning_paths WHERE title = 'Data Science Fundamentals'), (SELECT id FROM skills WHERE name = 'Machine Learning'), 2, 35, false),
((SELECT id FROM learning_paths WHERE title = 'Data Science Fundamentals'), (SELECT id FROM skills WHERE name = 'PostgreSQL'), 3, 10, false),

-- Cloud Architecture Mastery
((SELECT id FROM learning_paths WHERE title = 'Cloud Architecture Mastery'), (SELECT id FROM skills WHERE name = 'AWS'), 1, 40, true),
((SELECT id FROM learning_paths WHERE title = 'Cloud Architecture Mastery'), (SELECT id FROM skills WHERE name = 'Docker'), 2, 20, false),
((SELECT id FROM learning_paths WHERE title = 'Cloud Architecture Mastery'), (SELECT id FROM skills WHERE name = 'Kubernetes'), 3, 30, false),

-- DevOps Engineering
((SELECT id FROM learning_paths WHERE title = 'DevOps Engineering'), (SELECT id FROM skills WHERE name = 'Docker'), 1, 25, true),
((SELECT id FROM learning_paths WHERE title = 'DevOps Engineering'), (SELECT id FROM skills WHERE name = 'Kubernetes'), 2, 30, false),
((SELECT id FROM learning_paths WHERE title = 'DevOps Engineering'), (SELECT id FROM skills WHERE name = 'AWS'), 3, 25, false);

-- Create sample assessments
INSERT INTO assessments (title, description, skill_id, difficulty, time_limit, passing_score) VALUES
('Python Fundamentals', 'Basic Python programming concepts, syntax, and data structures', 
 (SELECT id FROM skills WHERE name = 'Python'), 'easy', 45, 70),
('JavaScript ES6+', 'Modern JavaScript features, async programming, and best practices', 
 (SELECT id FROM skills WHERE name = 'JavaScript'), 'medium', 60, 75),
('React Component Development', 'Building reusable React components and managing state', 
 (SELECT id FROM skills WHERE name = 'React'), 'medium', 90, 80),
('AWS Cloud Fundamentals', 'Basic AWS services, cloud concepts, and architecture patterns', 
 (SELECT id FROM skills WHERE name = 'AWS'), 'medium', 75, 70),
('Machine Learning Basics', 'Introduction to ML algorithms, model training, and evaluation', 
 (SELECT id FROM skills WHERE name = 'Machine Learning'), 'hard', 120, 75),
('Docker Containerization', 'Container concepts, Dockerfile creation, and orchestration', 
 (SELECT id FROM skills WHERE name = 'Docker'), 'medium', 60, 75),
('PostgreSQL Database Design', 'Database modeling, queries, and performance optimization', 
 (SELECT id FROM skills WHERE name = 'PostgreSQL'), 'medium', 90, 70),
('TypeScript Advanced Features', 'Advanced TypeScript concepts and type system', 
 (SELECT id FROM skills WHERE name = 'TypeScript'), 'hard', 75, 80);

-- Create sample learning resources
INSERT INTO learning_resources (title, url, resource_type, provider, duration, difficulty, rating, is_free, skill_id) VALUES
('Python Crash Course', 'https://example.com/python-course', 'course', 'TechEdu', 480, 'easy', 4.5, true, (SELECT id FROM skills WHERE name = 'Python')),
('JavaScript: The Complete Guide', 'https://example.com/js-guide', 'course', 'WebAcademy', 720, 'medium', 4.7, false, (SELECT id FROM skills WHERE name = 'JavaScript')),
('React Documentation', 'https://reactjs.org/docs', 'documentation', 'Facebook', 0, 'medium', 4.8, true, (SELECT id FROM skills WHERE name = 'React')),
('AWS Well-Architected Framework', 'https://aws.amazon.com/architecture/well-architected/', 'documentation', 'Amazon', 0, 'advanced', 4.6, true, (SELECT id FROM skills WHERE name = 'AWS')),
('Machine Learning Yearning', 'https://example.com/ml-yearning', 'book', 'Andrew Ng', 0, 'advanced', 4.9, true, (SELECT id FROM skills WHERE name = 'Machine Learning')),
('Docker Deep Dive', 'https://example.com/docker-course', 'video', 'CloudGuru', 360, 'medium', 4.4, false, (SELECT id FROM skills WHERE name = 'Docker')),
('PostgreSQL Tutorial', 'https://example.com/postgres-tutorial', 'tutorial', 'DBMaster', 240, 'medium', 4.3, true, (SELECT id FROM skills WHERE name = 'PostgreSQL'));

COMMIT;
