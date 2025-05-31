"""
SkillForge AI - Skill Taxonomy and Ontology System
Comprehensive skill classification, relationships, and semantic understanding
"""

import asyncio
import logging
import json
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import networkx as nx
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import redis
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import AgglomerativeClustering
import spacy
from transformers import AutoTokenizer, AutoModel
import torch

from app.core.database import get_db
from app.models.skill import Skill, SkillCategory, SkillRelationship
from app.models.job import Job, JobSkillRequirement
from app.models.learning import LearningContent
from app.utils.cache import cache_manager

logger = logging.getLogger(__name__)

class RelationshipType(Enum):
    PARENT_CHILD = "parent_child"
    PREREQUISITE = "prerequisite"
    COMPLEMENTARY = "complementary"
    ALTERNATIVE = "alternative"
    SPECIALIZATION = "specialization"
    DEPRECATED = "deprecated"

class SkillLevel(Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

@dataclass
class SkillNode:
    """Skill node in the taxonomy graph"""
    id: str
    name: str
    category: str
    level: SkillLevel
    description: str
    aliases: List[str]
    demand_score: float
    growth_rate: float
    salary_impact: float
    metadata: Dict[str, Any]

@dataclass
class SkillRelation:
    """Relationship between skills"""
    source_skill: str
    target_skill: str
    relationship_type: RelationshipType
    strength: float
    confidence: float
    metadata: Dict[str, Any]

class SkillTaxonomySystem:
    """Comprehensive skill taxonomy and ontology management system"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True
        )
        
        # Initialize NLP models
        self.nlp = spacy.load("en_core_web_lg")
        self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        self.model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        
        # Skill taxonomy graph
        self.taxonomy_graph = nx.DiGraph()
        
        # Industry frameworks mapping
        self.frameworks = {
            'sfia': self._load_sfia_framework(),
            'nice': self._load_nice_framework(),
            'onet': self._load_onet_framework(),
        }
        
        # Skill normalization mappings
        self.skill_mappings = {}
        self.skill_embeddings = {}
        
        # Demand tracking
        self.demand_tracker = SkillDemandTracker()
        
    async def initialize_taxonomy(self, db: Session):
        """Initialize the skill taxonomy from database and external sources"""
        
        try:
            logger.info("Initializing skill taxonomy...")
            
            # Load skills from database
            await self._load_skills_from_db(db)
            
            # Load external frameworks
            await self._integrate_external_frameworks()
            
            # Build skill relationships
            await self._build_skill_relationships(db)
            
            # Generate skill embeddings
            await self._generate_skill_embeddings()
            
            # Calculate skill metrics
            await self._calculate_skill_metrics(db)
            
            logger.info("Skill taxonomy initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize skill taxonomy: {e}")
            raise
    
    async def _load_skills_from_db(self, db: Session):
        """Load skills from database into taxonomy graph"""
        
        skills = db.query(Skill).all()
        
        for skill in skills:
            skill_node = SkillNode(
                id=str(skill.id),
                name=skill.name,
                category=skill.category.name if skill.category else 'uncategorized',
                level=SkillLevel.INTERMEDIATE,  # Default level
                description=skill.description or '',
                aliases=skill.aliases or [],
                demand_score=0.0,
                growth_rate=0.0,
                salary_impact=0.0,
                metadata={
                    'created_at': skill.created_at.isoformat() if skill.created_at else None,
                    'is_active': skill.is_active,
                    'difficulty_level': skill.difficulty_level,
                }
            )
            
            self.taxonomy_graph.add_node(skill.id, **skill_node.__dict__)
    
    async def _build_skill_relationships(self, db: Session):
        """Build relationships between skills based on various signals"""
        
        # Load explicit relationships from database
        relationships = db.query(SkillRelationship).all()
        
        for rel in relationships:
            self.taxonomy_graph.add_edge(
                rel.parent_skill_id,
                rel.child_skill_id,
                relationship_type=rel.relationship_type,
                strength=rel.strength or 1.0,
                confidence=rel.confidence or 1.0,
                metadata={'source': 'explicit', 'created_at': rel.created_at.isoformat()}
            )
        
        # Infer relationships from job postings
        await self._infer_relationships_from_jobs(db)
        
        # Infer relationships from learning content
        await self._infer_relationships_from_content(db)
        
        # Infer relationships using semantic similarity
        await self._infer_semantic_relationships()
    
    async def _infer_relationships_from_jobs(self, db: Session):
        """Infer skill relationships from job posting co-occurrence"""
        
        # Get skill co-occurrence in job postings
        job_skills_query = """
            SELECT j1.skill_id as skill1, j2.skill_id as skill2, COUNT(*) as co_occurrence
            FROM job_skill_requirements j1
            JOIN job_skill_requirements j2 ON j1.job_id = j2.job_id AND j1.skill_id < j2.skill_id
            GROUP BY j1.skill_id, j2.skill_id
            HAVING COUNT(*) >= 5
            ORDER BY co_occurrence DESC
        """
        
        result = db.execute(job_skills_query)
        
        for row in result:
            skill1, skill2, co_occurrence = row
            
            # Calculate relationship strength based on co-occurrence
            strength = min(co_occurrence / 100.0, 1.0)  # Normalize to 0-1
            
            # Add complementary relationship
            if not self.taxonomy_graph.has_edge(skill1, skill2):
                self.taxonomy_graph.add_edge(
                    skill1,
                    skill2,
                    relationship_type=RelationshipType.COMPLEMENTARY,
                    strength=strength,
                    confidence=0.7,
                    metadata={
                        'source': 'job_cooccurrence',
                        'co_occurrence_count': co_occurrence
                    }
                )
    
    async def _generate_skill_embeddings(self):
        """Generate semantic embeddings for all skills"""
        
        skills_data = []
        skill_ids = []
        
        for node_id, node_data in self.taxonomy_graph.nodes(data=True):
            # Combine name, description, and aliases for embedding
            text = f"{node_data['name']} {node_data['description']} {' '.join(node_data['aliases'])}"
            skills_data.append(text)
            skill_ids.append(node_id)
        
        # Generate embeddings using transformer model
        embeddings = await self._get_text_embeddings(skills_data)
        
        # Store embeddings
        for skill_id, embedding in zip(skill_ids, embeddings):
            self.skill_embeddings[skill_id] = embedding.tolist()
        
        # Cache embeddings
        await cache_manager.set(
            "skill_embeddings",
            self.skill_embeddings,
            ttl=86400  # 24 hours
        )
    
    async def _get_text_embeddings(self, texts: List[str]) -> np.ndarray:
        """Get embeddings for text using transformer model"""
        
        # Tokenize texts
        encoded = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors='pt'
        )
        
        # Generate embeddings
        with torch.no_grad():
            outputs = self.model(**encoded)
            embeddings = outputs.last_hidden_state.mean(dim=1)
        
        return embeddings.numpy()
    
    async def find_similar_skills(
        self,
        skill_id: str,
        similarity_threshold: float = 0.7,
        max_results: int = 10
    ) -> List[Tuple[str, float]]:
        """Find skills similar to the given skill"""
        
        if skill_id not in self.skill_embeddings:
            return []
        
        target_embedding = np.array(self.skill_embeddings[skill_id])
        similarities = []
        
        for other_skill_id, other_embedding in self.skill_embeddings.items():
            if other_skill_id == skill_id:
                continue
            
            # Calculate cosine similarity
            similarity = cosine_similarity(
                target_embedding.reshape(1, -1),
                np.array(other_embedding).reshape(1, -1)
            )[0][0]
            
            if similarity >= similarity_threshold:
                similarities.append((other_skill_id, similarity))
        
        # Sort by similarity and return top results
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:max_results]
    
    async def normalize_skill_name(self, skill_name: str) -> Optional[str]:
        """Normalize skill name to canonical form"""
        
        # Check direct mappings first
        normalized = self.skill_mappings.get(skill_name.lower())
        if normalized:
            return normalized
        
        # Use semantic similarity to find closest match
        skill_embedding = await self._get_text_embeddings([skill_name])
        best_match = None
        best_similarity = 0.0
        
        for skill_id, embedding in self.skill_embeddings.items():
            similarity = cosine_similarity(
                skill_embedding,
                np.array(embedding).reshape(1, -1)
            )[0][0]
            
            if similarity > best_similarity and similarity > 0.8:
                best_similarity = similarity
                best_match = skill_id
        
        if best_match:
            skill_node = self.taxonomy_graph.nodes[best_match]
            return skill_node['name']
        
        return None
    
    async def get_skill_prerequisites(self, skill_id: str) -> List[Dict[str, Any]]:
        """Get prerequisites for a skill"""
        
        prerequisites = []
        
        # Get direct prerequisites
        for pred in self.taxonomy_graph.predecessors(skill_id):
            edge_data = self.taxonomy_graph.edges[pred, skill_id]
            if edge_data.get('relationship_type') == RelationshipType.PREREQUISITE:
                skill_node = self.taxonomy_graph.nodes[pred]
                prerequisites.append({
                    'skill_id': pred,
                    'skill_name': skill_node['name'],
                    'strength': edge_data.get('strength', 1.0),
                    'confidence': edge_data.get('confidence', 1.0),
                    'is_required': edge_data.get('strength', 1.0) > 0.7
                })
        
        # Sort by strength
        prerequisites.sort(key=lambda x: x['strength'], reverse=True)
        
        return prerequisites
    
    async def get_skill_learning_path(
        self,
        target_skill_id: str,
        current_skills: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Generate optimal learning path to acquire a skill"""
        
        current_skills = current_skills or []
        learning_path = []
        
        # Use topological sort to find prerequisite order
        try:
            # Create subgraph with only prerequisite relationships
            prereq_graph = nx.DiGraph()
            
            for u, v, data in self.taxonomy_graph.edges(data=True):
                if data.get('relationship_type') == RelationshipType.PREREQUISITE:
                    prereq_graph.add_edge(u, v, **data)
            
            # Find all prerequisites for target skill
            if target_skill_id in prereq_graph:
                ancestors = nx.ancestors(prereq_graph, target_skill_id)
                ancestors.add(target_skill_id)
                
                # Create subgraph with prerequisites
                subgraph = prereq_graph.subgraph(ancestors)
                
                # Get topological order
                topo_order = list(nx.topological_sort(subgraph))
                
                # Filter out skills already known
                for skill_id in topo_order:
                    if skill_id not in current_skills:
                        skill_node = self.taxonomy_graph.nodes[skill_id]
                        learning_path.append({
                            'skill_id': skill_id,
                            'skill_name': skill_node['name'],
                            'category': skill_node['category'],
                            'difficulty': skill_node.get('level', 'intermediate'),
                            'estimated_time': self._estimate_learning_time(skill_id),
                            'importance': self._calculate_skill_importance(skill_id, target_skill_id)
                        })
            
        except nx.NetworkXError as e:
            logger.error(f"Error generating learning path: {e}")
        
        return learning_path
    
    async def analyze_skill_gaps(
        self,
        user_skills: List[str],
        target_job_skills: List[str]
    ) -> Dict[str, Any]:
        """Analyze skill gaps between user skills and job requirements"""
        
        user_skill_set = set(user_skills)
        target_skill_set = set(target_job_skills)
        
        # Direct gaps
        missing_skills = target_skill_set - user_skill_set
        
        # Find alternative skills that could substitute
        alternatives = {}
        for missing_skill in missing_skills:
            similar_skills = await self.find_similar_skills(missing_skill, similarity_threshold=0.8)
            user_alternatives = [skill for skill, _ in similar_skills if skill in user_skill_set]
            if user_alternatives:
                alternatives[missing_skill] = user_alternatives
        
        # Calculate transferable skills
        transferable = {}
        for user_skill in user_skills:
            related_skills = await self.find_similar_skills(user_skill, similarity_threshold=0.6)
            relevant_related = [skill for skill, sim in related_skills if skill in target_skill_set]
            if relevant_related:
                transferable[user_skill] = relevant_related
        
        # Prioritize missing skills by importance
        prioritized_gaps = []
        for skill_id in missing_skills:
            if skill_id in self.taxonomy_graph:
                skill_node = self.taxonomy_graph.nodes[skill_id]
                priority_score = (
                    skill_node.get('demand_score', 0.5) * 0.4 +
                    skill_node.get('salary_impact', 0.5) * 0.3 +
                    skill_node.get('growth_rate', 0.5) * 0.3
                )
                
                prioritized_gaps.append({
                    'skill_id': skill_id,
                    'skill_name': skill_node['name'],
                    'priority_score': priority_score,
                    'category': skill_node['category'],
                    'has_alternatives': skill_id in alternatives,
                    'alternatives': alternatives.get(skill_id, [])
                })
        
        prioritized_gaps.sort(key=lambda x: x['priority_score'], reverse=True)
        
        return {
            'missing_skills': list(missing_skills),
            'prioritized_gaps': prioritized_gaps,
            'alternatives': alternatives,
            'transferable_skills': transferable,
            'gap_percentage': len(missing_skills) / len(target_skill_set) * 100 if target_skill_set else 0,
            'match_percentage': len(user_skill_set & target_skill_set) / len(target_skill_set) * 100 if target_skill_set else 0
        }
    
    async def update_skill_demand(self, db: Session):
        """Update skill demand metrics based on job market data"""
        
        # Calculate demand scores from job postings
        demand_query = """
            SELECT 
                jsr.skill_id,
                COUNT(*) as job_count,
                AVG(j.salary_max) as avg_salary,
                COUNT(*) / (SELECT COUNT(*) FROM jobs WHERE created_at >= NOW() - INTERVAL '30 days') as demand_ratio
            FROM job_skill_requirements jsr
            JOIN jobs j ON jsr.job_id = j.id
            WHERE j.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY jsr.skill_id
        """
        
        result = db.execute(demand_query)
        
        for row in result:
            skill_id, job_count, avg_salary, demand_ratio = row
            
            if skill_id in self.taxonomy_graph:
                # Update node attributes
                self.taxonomy_graph.nodes[skill_id]['demand_score'] = min(demand_ratio * 10, 1.0)
                self.taxonomy_graph.nodes[skill_id]['salary_impact'] = (avg_salary or 0) / 200000  # Normalize to 0-1
                
                # Store in cache for quick access
                await cache_manager.set(
                    f"skill_demand:{skill_id}",
                    {
                        'demand_score': self.taxonomy_graph.nodes[skill_id]['demand_score'],
                        'salary_impact': self.taxonomy_graph.nodes[skill_id]['salary_impact'],
                        'job_count': job_count,
                        'updated_at': datetime.utcnow().isoformat()
                    },
                    ttl=86400
                )
    
    def _estimate_learning_time(self, skill_id: str) -> int:
        """Estimate learning time for a skill in hours"""
        
        if skill_id not in self.taxonomy_graph:
            return 40  # Default estimate
        
        skill_node = self.taxonomy_graph.nodes[skill_id]
        difficulty = skill_node.get('level', SkillLevel.INTERMEDIATE)
        
        # Base estimates by difficulty
        base_hours = {
            SkillLevel.BEGINNER: 20,
            SkillLevel.INTERMEDIATE: 40,
            SkillLevel.ADVANCED: 80,
            SkillLevel.EXPERT: 160
        }
        
        return base_hours.get(difficulty, 40)
    
    def _calculate_skill_importance(self, skill_id: str, target_skill_id: str) -> float:
        """Calculate importance of a skill for learning target skill"""
        
        # Base importance on relationship strength and demand
        importance = 0.5  # Base importance
        
        if skill_id in self.taxonomy_graph:
            skill_node = self.taxonomy_graph.nodes[skill_id]
            importance += skill_node.get('demand_score', 0) * 0.3
            importance += skill_node.get('salary_impact', 0) * 0.2
        
        # Check if it's a direct prerequisite
        if self.taxonomy_graph.has_edge(skill_id, target_skill_id):
            edge_data = self.taxonomy_graph.edges[skill_id, target_skill_id]
            if edge_data.get('relationship_type') == RelationshipType.PREREQUISITE:
                importance += edge_data.get('strength', 0.5) * 0.5
        
        return min(importance, 1.0)
    
    def _load_sfia_framework(self) -> Dict[str, Any]:
        """Load SFIA (Skills Framework for the Information Age) framework"""
        # Implementation would load SFIA skill definitions
        return {}
    
    def _load_nice_framework(self) -> Dict[str, Any]:
        """Load NICE (National Initiative for Cybersecurity Education) framework"""
        # Implementation would load NICE cybersecurity skill definitions
        return {}
    
    def _load_onet_framework(self) -> Dict[str, Any]:
        """Load O*NET occupational framework"""
        # Implementation would load O*NET skill and occupation data
        return {}

class SkillDemandTracker:
    """Track skill demand trends over time"""
    
    def __init__(self):
        self.demand_history = {}
    
    async def track_demand_change(self, skill_id: str, current_demand: float):
        """Track demand changes for a skill"""
        
        if skill_id not in self.demand_history:
            self.demand_history[skill_id] = []
        
        self.demand_history[skill_id].append({
            'timestamp': datetime.utcnow().isoformat(),
            'demand_score': current_demand
        })
        
        # Keep only last 90 days of data
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        self.demand_history[skill_id] = [
            entry for entry in self.demand_history[skill_id]
            if datetime.fromisoformat(entry['timestamp']) > cutoff_date
        ]

# Initialize global skill taxonomy system
skill_taxonomy = SkillTaxonomySystem()
