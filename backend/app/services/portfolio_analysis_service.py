"""
Portfolio Analysis Service for SkillForge AI Backend
Implements CLIP-based visual project analysis and skill extraction
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
import json
import re
import base64
import io
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
from PIL import Image
import numpy as np

# Import AI services (with fallback for development)
try:
    import torch
    from transformers import CLIPProcessor, CLIPModel
    import cv2
    VISION_MODELS_AVAILABLE = True
except ImportError:
    VISION_MODELS_AVAILABLE = False

logger = logging.getLogger(__name__)


class ProjectType(Enum):
    """Project type classifications"""
    WEB_APPLICATION = "web_application"
    MOBILE_APP = "mobile_app"
    DESKTOP_APPLICATION = "desktop_application"
    DATA_SCIENCE = "data_science"
    MACHINE_LEARNING = "machine_learning"
    GAME_DEVELOPMENT = "game_development"
    API_SERVICE = "api_service"
    INFRASTRUCTURE = "infrastructure"
    DESIGN_SYSTEM = "design_system"
    OTHER = "other"


@dataclass
class VisualElement:
    """Visual element detected in project screenshots"""
    element_type: str
    confidence: float
    description: str
    skills_implied: List[str]
    coordinates: Optional[Tuple[int, int, int, int]] = None


@dataclass
class ProjectAnalysis:
    """Complete project analysis result"""
    project_id: str
    project_type: ProjectType
    confidence: float
    visual_elements: List[VisualElement]
    extracted_skills: List[Dict[str, Any]]
    technology_stack: List[str]
    complexity_score: float
    design_quality_score: float
    functionality_score: float
    recommendations: List[str]
    analysis_metadata: Dict[str, Any]
    timestamp: datetime


class PortfolioAnalysisService:
    """Advanced portfolio analysis using CLIP and computer vision"""
    
    def __init__(self):
        self.clip_model = None
        self.clip_processor = None
        self.technology_patterns = self._load_technology_patterns()
        self.ui_element_classifiers = self._load_ui_classifiers()
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize CLIP model and computer vision components"""
        try:
            if VISION_MODELS_AVAILABLE:
                logger.info("Initializing CLIP model for portfolio analysis...")
                
                # Use CLIP for visual understanding
                model_name = "openai/clip-vit-base-patch32"
                
                self.clip_model = CLIPModel.from_pretrained(model_name)
                self.clip_processor = CLIPProcessor.from_pretrained(model_name)
                
                logger.info("CLIP model initialized successfully")
            else:
                logger.warning("Vision models not available, using mock analysis")
                
        except Exception as e:
            logger.error(f"Error initializing CLIP model: {e}")
    
    def _load_technology_patterns(self) -> Dict[str, Any]:
        """Load technology detection patterns"""
        return {
            "web_frameworks": {
                "react": {
                    "visual_indicators": ["component structure", "jsx syntax", "react logo"],
                    "ui_patterns": ["component-based layout", "modern web interface"],
                    "skills": ["React", "JavaScript", "JSX", "Component Architecture"]
                },
                "vue": {
                    "visual_indicators": ["vue syntax", "vue logo", "template structure"],
                    "ui_patterns": ["vue component structure", "directive usage"],
                    "skills": ["Vue.js", "JavaScript", "Template Syntax", "Component Design"]
                },
                "angular": {
                    "visual_indicators": ["angular syntax", "angular logo", "typescript"],
                    "ui_patterns": ["angular material", "component architecture"],
                    "skills": ["Angular", "TypeScript", "RxJS", "Angular Material"]
                }
            },
            "mobile_frameworks": {
                "react_native": {
                    "visual_indicators": ["mobile interface", "react native components"],
                    "ui_patterns": ["native mobile UI", "cross-platform design"],
                    "skills": ["React Native", "Mobile Development", "Cross-platform"]
                },
                "flutter": {
                    "visual_indicators": ["flutter widgets", "dart syntax", "material design"],
                    "ui_patterns": ["flutter UI components", "material design"],
                    "skills": ["Flutter", "Dart", "Mobile Development", "Material Design"]
                }
            },
            "data_science": {
                "jupyter": {
                    "visual_indicators": ["jupyter notebook", "code cells", "data visualization"],
                    "ui_patterns": ["notebook interface", "matplotlib plots", "pandas dataframes"],
                    "skills": ["Python", "Jupyter", "Data Analysis", "Data Visualization"]
                },
                "dashboards": {
                    "visual_indicators": ["charts", "graphs", "data tables", "metrics"],
                    "ui_patterns": ["dashboard layout", "data visualization", "KPI displays"],
                    "skills": ["Data Visualization", "Dashboard Design", "Analytics", "BI Tools"]
                }
            },
            "design_systems": {
                "ui_components": {
                    "visual_indicators": ["component library", "design tokens", "style guide"],
                    "ui_patterns": ["consistent design", "component showcase"],
                    "skills": ["UI/UX Design", "Design Systems", "Component Design", "Style Guides"]
                }
            }
        }
    
    def _load_ui_classifiers(self) -> Dict[str, List[str]]:
        """Load UI element classification prompts for CLIP"""
        return {
            "web_interface": [
                "a modern web application interface",
                "a responsive website design",
                "a web dashboard with navigation",
                "a single page application"
            ],
            "mobile_interface": [
                "a mobile app interface",
                "a smartphone application screen",
                "a mobile user interface design",
                "a native mobile app"
            ],
            "data_visualization": [
                "a data dashboard with charts",
                "data visualization and analytics",
                "business intelligence dashboard",
                "statistical charts and graphs"
            ],
            "code_interface": [
                "a code editor or IDE",
                "programming code on screen",
                "software development environment",
                "terminal or command line interface"
            ],
            "design_system": [
                "a design system or component library",
                "UI component showcase",
                "style guide and design tokens",
                "user interface design patterns"
            ]
        }
    
    async def analyze_project_screenshot(
        self,
        image_data: bytes,
        project_metadata: Dict[str, Any] = None
    ) -> ProjectAnalysis:
        """Analyze a project screenshot using computer vision"""
        try:
            project_id = project_metadata.get("project_id", f"project_{datetime.utcnow().timestamp()}")
            
            # Convert image data to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Analyze with CLIP if available
            if self.clip_model and self.clip_processor:
                analysis = await self._analyze_with_clip(image, project_metadata)
            else:
                analysis = self._generate_mock_analysis(project_id, project_metadata)
            
            logger.info(f"Completed portfolio analysis for project {project_id}")
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing project screenshot: {e}")
            return self._generate_error_analysis(project_metadata)
    
    async def _analyze_with_clip(
        self,
        image: Image.Image,
        project_metadata: Dict[str, Any]
    ) -> ProjectAnalysis:
        """Analyze image using CLIP model"""
        try:
            project_id = project_metadata.get("project_id", f"project_{datetime.utcnow().timestamp()}")
            
            # Classify project type
            project_type, type_confidence = await self._classify_project_type(image)
            
            # Detect visual elements
            visual_elements = await self._detect_visual_elements(image)
            
            # Extract technology stack
            technology_stack = self._extract_technology_stack(visual_elements, project_metadata)
            
            # Extract skills
            extracted_skills = self._extract_skills_from_analysis(visual_elements, technology_stack)
            
            # Calculate scores
            complexity_score = self._calculate_complexity_score(visual_elements, technology_stack)
            design_quality_score = await self._assess_design_quality(image)
            functionality_score = self._assess_functionality(visual_elements)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                project_type, visual_elements, technology_stack, 
                complexity_score, design_quality_score
            )
            
            return ProjectAnalysis(
                project_id=project_id,
                project_type=project_type,
                confidence=type_confidence,
                visual_elements=visual_elements,
                extracted_skills=extracted_skills,
                technology_stack=technology_stack,
                complexity_score=complexity_score,
                design_quality_score=design_quality_score,
                functionality_score=functionality_score,
                recommendations=recommendations,
                analysis_metadata={
                    "image_size": image.size,
                    "analysis_method": "clip_vision",
                    "model_version": "clip-vit-base-patch32"
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error in CLIP analysis: {e}")
            return self._generate_error_analysis(project_metadata)
    
    async def _classify_project_type(self, image: Image.Image) -> Tuple[ProjectType, float]:
        """Classify project type using CLIP"""
        try:
            # Prepare classification prompts
            type_prompts = [
                "a web application interface",
                "a mobile app screen",
                "a desktop application",
                "a data science notebook or dashboard",
                "a machine learning model interface",
                "a game interface or game development",
                "an API documentation or service",
                "infrastructure or DevOps dashboard",
                "a design system or component library"
            ]
            
            # Process image and text
            inputs = self.clip_processor(
                text=type_prompts,
                images=image,
                return_tensors="pt",
                padding=True
            )
            
            # Get predictions
            with torch.no_grad():
                outputs = self.clip_model(**inputs)
                logits_per_image = outputs.logits_per_image
                probs = logits_per_image.softmax(dim=1)
            
            # Get best match
            best_idx = torch.argmax(probs, dim=1).item()
            confidence = probs[0][best_idx].item()
            
            # Map to ProjectType
            type_mapping = [
                ProjectType.WEB_APPLICATION,
                ProjectType.MOBILE_APP,
                ProjectType.DESKTOP_APPLICATION,
                ProjectType.DATA_SCIENCE,
                ProjectType.MACHINE_LEARNING,
                ProjectType.GAME_DEVELOPMENT,
                ProjectType.API_SERVICE,
                ProjectType.INFRASTRUCTURE,
                ProjectType.DESIGN_SYSTEM
            ]
            
            project_type = type_mapping[best_idx] if best_idx < len(type_mapping) else ProjectType.OTHER
            
            return project_type, confidence
            
        except Exception as e:
            logger.error(f"Error classifying project type: {e}")
            return ProjectType.WEB_APPLICATION, 0.5
    
    async def _detect_visual_elements(self, image: Image.Image) -> List[VisualElement]:
        """Detect visual elements in the image"""
        try:
            visual_elements = []
            
            # Check for different UI element types
            for element_type, prompts in self.ui_element_classifiers.items():
                
                inputs = self.clip_processor(
                    text=prompts,
                    images=image,
                    return_tensors="pt",
                    padding=True
                )
                
                with torch.no_grad():
                    outputs = self.clip_model(**inputs)
                    logits_per_image = outputs.logits_per_image
                    probs = logits_per_image.softmax(dim=1)
                
                # Get best match for this element type
                best_idx = torch.argmax(probs, dim=1).item()
                confidence = probs[0][best_idx].item()
                
                if confidence > 0.3:  # Threshold for detection
                    # Map element type to skills
                    skills_implied = self._map_element_to_skills(element_type, prompts[best_idx])
                    
                    visual_element = VisualElement(
                        element_type=element_type,
                        confidence=confidence,
                        description=prompts[best_idx],
                        skills_implied=skills_implied
                    )
                    visual_elements.append(visual_element)
            
            return visual_elements
            
        except Exception as e:
            logger.error(f"Error detecting visual elements: {e}")
            return []
    
    def _map_element_to_skills(self, element_type: str, description: str) -> List[str]:
        """Map visual elements to implied skills"""
        skill_mapping = {
            "web_interface": ["HTML", "CSS", "JavaScript", "Web Development", "Frontend"],
            "mobile_interface": ["Mobile Development", "UI/UX Design", "Cross-platform"],
            "data_visualization": ["Data Analysis", "Data Visualization", "Python", "R", "BI Tools"],
            "code_interface": ["Programming", "Software Development", "IDE Usage"],
            "design_system": ["UI/UX Design", "Design Systems", "Component Design"]
        }
        
        return skill_mapping.get(element_type, ["General Development"])
    
    def _extract_technology_stack(
        self,
        visual_elements: List[VisualElement],
        project_metadata: Dict[str, Any]
    ) -> List[str]:
        """Extract technology stack from visual analysis"""
        try:
            technologies = set()
            
            # Extract from visual elements
            for element in visual_elements:
                if element.element_type == "web_interface":
                    technologies.update(["HTML", "CSS", "JavaScript"])
                elif element.element_type == "mobile_interface":
                    technologies.update(["Mobile Development"])
                elif element.element_type == "data_visualization":
                    technologies.update(["Python", "Data Visualization"])
            
            # Extract from metadata if available
            if project_metadata:
                description = project_metadata.get("description", "").lower()
                title = project_metadata.get("title", "").lower()
                
                # Technology detection patterns
                tech_patterns = {
                    "react": ["react", "jsx", "component"],
                    "vue": ["vue", "vuejs"],
                    "angular": ["angular", "typescript"],
                    "python": ["python", "django", "flask", "fastapi"],
                    "javascript": ["javascript", "js", "node"],
                    "typescript": ["typescript", "ts"],
                    "docker": ["docker", "container"],
                    "kubernetes": ["kubernetes", "k8s"],
                    "aws": ["aws", "amazon web services"],
                    "postgresql": ["postgresql", "postgres"],
                    "mongodb": ["mongodb", "mongo"],
                    "redis": ["redis", "cache"]
                }
                
                text_to_search = f"{description} {title}"
                for tech, patterns in tech_patterns.items():
                    if any(pattern in text_to_search for pattern in patterns):
                        technologies.add(tech.title())
            
            return list(technologies)
            
        except Exception as e:
            logger.error(f"Error extracting technology stack: {e}")
            return []
    
    def _extract_skills_from_analysis(
        self,
        visual_elements: List[VisualElement],
        technology_stack: List[str]
    ) -> List[Dict[str, Any]]:
        """Extract skills from complete analysis"""
        try:
            skills = {}
            
            # Skills from visual elements
            for element in visual_elements:
                for skill in element.skills_implied:
                    if skill not in skills:
                        skills[skill] = {
                            "skill": skill,
                            "confidence": element.confidence,
                            "source": "visual_analysis",
                            "category": self._categorize_skill(skill)
                        }
                    else:
                        # Update confidence (take max)
                        skills[skill]["confidence"] = max(
                            skills[skill]["confidence"], 
                            element.confidence
                        )
            
            # Skills from technology stack
            for tech in technology_stack:
                if tech not in skills:
                    skills[tech] = {
                        "skill": tech,
                        "confidence": 0.8,
                        "source": "technology_detection",
                        "category": self._categorize_skill(tech)
                    }
            
            return list(skills.values())
            
        except Exception as e:
            logger.error(f"Error extracting skills: {e}")
            return []
    
    def _categorize_skill(self, skill: str) -> str:
        """Categorize a skill"""
        skill_lower = skill.lower()
        
        if skill_lower in ["html", "css", "javascript", "typescript", "react", "vue", "angular"]:
            return "frontend"
        elif skill_lower in ["python", "java", "c++", "c#", "go", "rust"]:
            return "programming_languages"
        elif skill_lower in ["postgresql", "mongodb", "mysql", "redis"]:
            return "databases"
        elif skill_lower in ["aws", "azure", "gcp", "docker", "kubernetes"]:
            return "cloud_infrastructure"
        elif skill_lower in ["ui/ux design", "design systems", "component design"]:
            return "design"
        elif skill_lower in ["data analysis", "data visualization", "machine learning"]:
            return "data_science"
        else:
            return "general"
    
    def _calculate_complexity_score(
        self,
        visual_elements: List[VisualElement],
        technology_stack: List[str]
    ) -> float:
        """Calculate project complexity score"""
        try:
            base_score = 0.3
            
            # Score based on number of technologies
            tech_score = min(len(technology_stack) * 0.1, 0.4)
            
            # Score based on visual complexity
            element_score = min(len(visual_elements) * 0.05, 0.3)
            
            # Bonus for advanced technologies
            advanced_tech_bonus = 0.0
            advanced_techs = ["machine learning", "kubernetes", "microservices", "ai"]
            for tech in technology_stack:
                if any(adv in tech.lower() for adv in advanced_techs):
                    advanced_tech_bonus += 0.1
            
            total_score = min(base_score + tech_score + element_score + advanced_tech_bonus, 1.0)
            return round(total_score, 2)
            
        except Exception as e:
            logger.error(f"Error calculating complexity score: {e}")
            return 0.5
    
    async def _assess_design_quality(self, image: Image.Image) -> float:
        """Assess design quality using CLIP"""
        try:
            if not self.clip_model:
                return 0.7  # Default score
            
            quality_prompts = [
                "a well-designed user interface",
                "a professional looking application",
                "a modern and clean design",
                "a polished software interface"
            ]
            
            inputs = self.clip_processor(
                text=quality_prompts,
                images=image,
                return_tensors="pt",
                padding=True
            )
            
            with torch.no_grad():
                outputs = self.clip_model(**inputs)
                logits_per_image = outputs.logits_per_image
                probs = logits_per_image.softmax(dim=1)
            
            # Average confidence across quality indicators
            avg_quality = torch.mean(probs).item()
            return round(avg_quality, 2)
            
        except Exception as e:
            logger.error(f"Error assessing design quality: {e}")
            return 0.7
    
    def _assess_functionality(self, visual_elements: List[VisualElement]) -> float:
        """Assess functionality based on visual elements"""
        try:
            if not visual_elements:
                return 0.5
            
            # Score based on variety and confidence of detected elements
            avg_confidence = sum(elem.confidence for elem in visual_elements) / len(visual_elements)
            variety_score = min(len(set(elem.element_type for elem in visual_elements)) * 0.2, 1.0)
            
            functionality_score = (avg_confidence * 0.6) + (variety_score * 0.4)
            return round(functionality_score, 2)
            
        except Exception as e:
            logger.error(f"Error assessing functionality: {e}")
            return 0.5
    
    def _generate_recommendations(
        self,
        project_type: ProjectType,
        visual_elements: List[VisualElement],
        technology_stack: List[str],
        complexity_score: float,
        design_quality_score: float
    ) -> List[str]:
        """Generate improvement recommendations"""
        try:
            recommendations = []
            
            # Design recommendations
            if design_quality_score < 0.6:
                recommendations.append("Consider improving the visual design and user interface")
                recommendations.append("Add consistent styling and better visual hierarchy")
            
            # Technology recommendations
            if complexity_score < 0.5:
                recommendations.append("Consider adding more advanced features or technologies")
                recommendations.append("Implement additional functionality to showcase your skills")
            
            # Project-specific recommendations
            if project_type == ProjectType.WEB_APPLICATION:
                if "responsive design" not in [elem.description for elem in visual_elements]:
                    recommendations.append("Ensure responsive design for mobile compatibility")
                if not any("javascript" in tech.lower() for tech in technology_stack):
                    recommendations.append("Add interactive JavaScript features")
            
            elif project_type == ProjectType.DATA_SCIENCE:
                if not any("visualization" in elem.element_type for elem in visual_elements):
                    recommendations.append("Add more data visualizations and charts")
                recommendations.append("Include statistical analysis and insights")
            
            # General recommendations
            if len(technology_stack) < 3:
                recommendations.append("Showcase a broader range of technologies and skills")
            
            recommendations.append("Add detailed documentation and README")
            recommendations.append("Include live demo links and deployment information")
            
            return recommendations[:5]  # Limit to top 5 recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return ["Add more detailed project documentation"]
    
    def _generate_mock_analysis(
        self,
        project_id: str,
        project_metadata: Dict[str, Any]
    ) -> ProjectAnalysis:
        """Generate mock analysis when models aren't available"""
        try:
            # Mock visual elements
            visual_elements = [
                VisualElement(
                    element_type="web_interface",
                    confidence=0.85,
                    description="a modern web application interface",
                    skills_implied=["HTML", "CSS", "JavaScript", "Web Development"]
                ),
                VisualElement(
                    element_type="data_visualization",
                    confidence=0.72,
                    description="data visualization and analytics",
                    skills_implied=["Data Visualization", "Python", "Analytics"]
                )
            ]
            
            # Mock technology stack
            technology_stack = ["React", "Python", "PostgreSQL", "Docker"]
            
            # Mock extracted skills
            extracted_skills = [
                {"skill": "React", "confidence": 0.9, "source": "visual_analysis", "category": "frontend"},
                {"skill": "Python", "confidence": 0.85, "source": "technology_detection", "category": "programming_languages"},
                {"skill": "Data Visualization", "confidence": 0.8, "source": "visual_analysis", "category": "data_science"}
            ]
            
            return ProjectAnalysis(
                project_id=project_id,
                project_type=ProjectType.WEB_APPLICATION,
                confidence=0.8,
                visual_elements=visual_elements,
                extracted_skills=extracted_skills,
                technology_stack=technology_stack,
                complexity_score=0.75,
                design_quality_score=0.8,
                functionality_score=0.85,
                recommendations=[
                    "Add responsive design for mobile compatibility",
                    "Include more interactive features",
                    "Add comprehensive documentation",
                    "Consider implementing user authentication",
                    "Add automated testing"
                ],
                analysis_metadata={
                    "analysis_method": "mock_analysis",
                    "model_version": "development_fallback"
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error generating mock analysis: {e}")
            return self._generate_error_analysis(project_metadata)
    
    def _generate_error_analysis(self, project_metadata: Dict[str, Any]) -> ProjectAnalysis:
        """Generate error analysis result"""
        project_id = project_metadata.get("project_id", "error_project") if project_metadata else "error_project"
        
        return ProjectAnalysis(
            project_id=project_id,
            project_type=ProjectType.OTHER,
            confidence=0.0,
            visual_elements=[],
            extracted_skills=[],
            technology_stack=[],
            complexity_score=0.0,
            design_quality_score=0.0,
            functionality_score=0.0,
            recommendations=["Unable to analyze project - please try again"],
            analysis_metadata={"error": "Analysis failed"},
            timestamp=datetime.utcnow()
        )
    
    async def analyze_portfolio_batch(
        self,
        projects: List[Dict[str, Any]]
    ) -> List[ProjectAnalysis]:
        """Analyze multiple projects in batch"""
        try:
            analyses = []
            
            for project in projects:
                if "image_data" in project:
                    analysis = await self.analyze_project_screenshot(
                        project["image_data"],
                        project.get("metadata", {})
                    )
                    analyses.append(analysis)
            
            return analyses
            
        except Exception as e:
            logger.error(f"Error in batch portfolio analysis: {e}")
            return []
    
    async def generate_portfolio_summary(
        self,
        analyses: List[ProjectAnalysis]
    ) -> Dict[str, Any]:
        """Generate overall portfolio summary"""
        try:
            if not analyses:
                return {"error": "No analyses provided"}
            
            # Aggregate skills
            all_skills = {}
            for analysis in analyses:
                for skill in analysis.extracted_skills:
                    skill_name = skill["skill"]
                    if skill_name not in all_skills:
                        all_skills[skill_name] = {
                            "skill": skill_name,
                            "category": skill["category"],
                            "max_confidence": skill["confidence"],
                            "project_count": 1
                        }
                    else:
                        all_skills[skill_name]["max_confidence"] = max(
                            all_skills[skill_name]["max_confidence"],
                            skill["confidence"]
                        )
                        all_skills[skill_name]["project_count"] += 1
            
            # Calculate averages
            avg_complexity = sum(a.complexity_score for a in analyses) / len(analyses)
            avg_design_quality = sum(a.design_quality_score for a in analyses) / len(analyses)
            avg_functionality = sum(a.functionality_score for a in analyses) / len(analyses)
            
            # Project type distribution
            project_types = {}
            for analysis in analyses:
                ptype = analysis.project_type.value
                project_types[ptype] = project_types.get(ptype, 0) + 1
            
            # Technology stack frequency
            tech_frequency = {}
            for analysis in analyses:
                for tech in analysis.technology_stack:
                    tech_frequency[tech] = tech_frequency.get(tech, 0) + 1
            
            return {
                "total_projects": len(analyses),
                "skills_summary": list(all_skills.values()),
                "average_scores": {
                    "complexity": round(avg_complexity, 2),
                    "design_quality": round(avg_design_quality, 2),
                    "functionality": round(avg_functionality, 2)
                },
                "project_type_distribution": project_types,
                "technology_frequency": tech_frequency,
                "top_skills": sorted(
                    all_skills.values(),
                    key=lambda x: (x["project_count"], x["max_confidence"]),
                    reverse=True
                )[:10],
                "analysis_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating portfolio summary: {e}")
            return {"error": str(e)}


# Global portfolio analysis service instance
portfolio_analysis_service = PortfolioAnalysisService()
