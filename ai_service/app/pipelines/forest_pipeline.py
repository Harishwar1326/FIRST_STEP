import networkx as nx
import logging
from typing import Dict, List
from collections import defaultdict
import random

logger = logging.getLogger("ai_service")

class ForestPipeline:
    def __init__(self):
        # In-memory storage for demo (in production, use database)
        self.user_graphs = {}
        self.user_paths = {}
        self.user_concepts = defaultdict(dict)
    
    async def generate_graph(self, user_id: str) -> Dict:
        """
        Generate interactive knowledge graph from student's notes
        """
        try:
            # Check if graph exists
            if user_id not in self.user_graphs:
                # Generate initial graph
                graph = self._create_initial_graph(user_id)
                self.user_graphs[user_id] = graph
            else:
                # Update existing graph
                graph = self._update_graph(user_id)
                self.user_graphs[user_id] = graph
            
            return graph
        except Exception as e:
            logger.error(f"Knowledge graph generation error: {str(e)}")
            raise
    
    def _create_initial_graph(self, user_id: str) -> Dict:
        """Create initial knowledge graph for new user"""
        # Define concept hierarchy
        concepts = self._get_concept_hierarchy()
        
        # Create nodes
        nodes = []
        for concept_id, concept_data in concepts.items():
            nodes.append({
                "id": concept_id,
                "name": concept_data["name"],
                "category": concept_data["category"],
                "mastery": random.randint(40, 90),
                "connections": 0,
                "difficulty": concept_data["difficulty"]
            })
        
        # Create edges based on relationships
        edges = []
        relationships = self._get_concept_relationships()
        
        for rel in relationships:
            source_id = rel["source"]
            target_id = rel["target"]
            
            # Update connection counts
            for node in nodes:
                if node["id"] == source_id or node["id"] == target_id:
                    node["connections"] += 1
            
            edges.append({
                "source": source_id,
                "target": target_id,
                "type": rel["type"],
                "strength": rel["strength"]
            })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "lastUpdated": "2024-01-15T00:00:00Z",
            "totalConcepts": len(nodes),
            "totalConnections": len(edges)
        }
    
    def _update_graph(self, user_id: str) -> Dict:
        """Update existing knowledge graph based on learning progress"""
        graph = self.user_graphs[user_id]
        
        # Simulate mastery updates based on recent activity
        for node in graph["nodes"]:
            # Randomly increase mastery for some concepts
            if random.random() > 0.7:
                node["mastery"] = min(100, node["mastery"] + random.randint(1, 5))
        
        graph["lastUpdated"] = "2024-01-15T00:00:00Z"
        return graph
    
    def _get_concept_hierarchy(self) -> Dict:
        """Get concept hierarchy for different subjects"""
        return {
            "physics-thermo": {"name": "Thermodynamics", "category": "Physics", "difficulty": "medium"},
            "physics-newton": {"name": "Newton's Laws", "category": "Physics", "difficulty": "easy"},
            "physics-electro": {"name": "Electromagnetism", "category": "Physics", "difficulty": "hard"},
            "math-calc": {"name": "Calculus", "category": "Mathematics", "difficulty": "hard"},
            "math-algebra": {"name": "Algebra", "category": "Mathematics", "difficulty": "easy"},
            "math-geometry": {"name": "Geometry", "category": "Mathematics", "difficulty": "medium"},
            "chem-organic": {"name": "Organic Chemistry", "category": "Chemistry", "difficulty": "hard"},
            "chem-periodic": {"name": "Periodic Table", "category": "Chemistry", "difficulty": "easy"},
            "bio-cell": {"name": "Cell Biology", "category": "Biology", "difficulty": "medium"},
            "bio-genetics": {"name": "Genetics", "category": "Biology", "difficulty": "hard"},
        }
    
    def _get_concept_relationships(self) -> List[Dict]:
        """Get relationships between concepts"""
        return [
            {"source": "math-algebra", "target": "math-calc", "type": "prerequisite", "strength": 0.9},
            {"source": "math-geometry", "target": "math-calc", "type": "prerequisite", "strength": 0.8},
            {"source": "physics-newton", "target": "physics-thermo", "type": "related", "strength": 0.7},
            {"source": "math-calc", "target": "physics-thermo", "type": "applies-to", "strength": 0.9},
            {"source": "chem-periodic", "target": "chem-organic", "type": "prerequisite", "strength": 0.8},
            {"source": "bio-cell", "target": "bio-genetics", "type": "prerequisite", "strength": 0.9},
            {"source": "physics-thermo", "target": "chem-organic", "type": "related", "strength": 0.5},
            {"source": "math-calc", "target": "physics-electro", "type": "applies-to", "strength": 0.8},
        ]
    
    async def generate_learning_path(self, user_id: str) -> Dict:
        """
        Generate personalized learning path based on knowledge gaps
        """
        try:
            # Get user's knowledge graph
            graph = self.user_graphs.get(user_id, self._create_initial_graph(user_id))
            
            # Use NetworkX to find optimal learning path
            G = nx.DiGraph()
            
            # Add nodes with mastery levels
            for node in graph["nodes"]:
                G.add_node(node["id"], mastery=node["mastery"])
            
            # Add edges
            for edge in graph["edges"]:
                G.add_edge(edge["source"], edge["target"], weight=1 - edge["strength"])
            
            # Find concepts with low mastery
            low_mastery = [node for node in graph["nodes"] if node["mastery"] < 70]
            
            # Sort by mastery (lowest first)
            low_mastery.sort(key=lambda x: x["mastery"])
            
            # Generate learning steps
            steps = []
            for i, concept in enumerate(low_mastery[:5]):  # Top 5 concepts to learn
                # Find prerequisites
                prerequisites = []
                for edge in graph["edges"]:
                    if edge["target"] == concept["id"] and edge["type"] == "prerequisite":
                        prerequisites.append(edge["source"])
                
                # Determine status based on prerequisites
                prereq_mastery = [G.nodes[p]["mastery"] for p in prerequisites if p in G.nodes]
                if prereq_mastery and all(m >= 70 for m in prereq_mastery):
                    status = "ready"
                elif prereq_mastery and any(m < 70 for m in prereq_mastery):
                    status = "blocked"
                else:
                    status = "available"
                
                steps.append({
                    "order": i + 1,
                    "concept": concept["name"],
                    "conceptId": concept["id"],
                    "status": status,
                    "prerequisites": prerequisites,
                    "estimatedTime": self._estimate_learning_time(concept["difficulty"]),
                    "category": concept["category"]
                })
            
            # Calculate progress
            completed = sum(1 for node in graph["nodes"] if node["mastery"] >= 80)
            progress = int((completed / len(graph["nodes"])) * 100)
            
            return {
                "steps": steps,
                "estimatedDuration": f"{len(steps) * 2} weeks",
                "currentStep": self._get_current_step(steps),
                "progress": progress,
                "totalSteps": len(steps)
            }
        except Exception as e:
            logger.error(f"Learning path generation error: {str(e)}")
            raise
    
    def _estimate_learning_time(self, difficulty: str) -> str:
        """Estimate learning time based on difficulty"""
        times = {
            "easy": "1-2 weeks",
            "medium": "2-3 weeks",
            "hard": "3-4 weeks"
        }
        return times.get(difficulty, "2 weeks")
    
    def _get_current_step(self, steps: List[Dict]) -> int:
        """Get current step in learning path"""
        for i, step in enumerate(steps):
            if step["status"] in ["available", "ready"]:
                return i + 1
        return 1
    
    async def detect_gaps(self, user_id: str) -> Dict:
        """
        Detect learning gaps using knowledge graph analysis
        """
        try:
            # Get user's knowledge graph
            graph = self.user_graphs.get(user_id, self._create_initial_graph(user_id))
            
            # Use NetworkX for graph analysis
            G = nx.Graph()
            
            # Add nodes
            for node in graph["nodes"]:
                G.add_node(node["id"], mastery=node["mastery"])
            
            # Add edges
            for edge in graph["edges"]:
                G.add_edge(edge["source"], edge["target"])
            
            # Find gaps using graph centrality and mastery
            gaps = []
            
            # Find concepts with low mastery but high centrality (important but weak)
            centrality = nx.betweenness_centrality(G)
            
            for node in graph["nodes"]:
                node_id = node["id"]
                mastery = node["mastery"]
                importance = centrality.get(node_id, 0)
                
                # Gap: low mastery but high importance
                if mastery < 60 and importance > 0.3:
                    gaps.append({
                        "concept": node["name"],
                        "conceptId": node_id,
                        "reason": f"Important concept (centrality: {importance:.2f}) with low mastery",
                        "priority": "high" if importance > 0.5 else "medium",
                        "currentMastery": mastery,
                        "importance": importance
                    })
            
            # Find missing prerequisites
            for edge in graph["edges"]:
                if edge["type"] == "prerequisite":
                    source_mastery = next((n["mastery"] for n in graph["nodes"] if n["id"] == edge["source"]), 0)
                    target_mastery = next((n["mastery"] for n in graph["nodes"] if n["id"] == edge["target"]), 0)
                    
                    # Gap: prerequisite has low mastery but target is being learned
                    if source_mastery < 60 and target_mastery > 50:
                        source_name = next((n["name"] for n in graph["nodes"] if n["id"] == edge["source"]), "")
                        gaps.append({
                            "concept": source_name,
                            "conceptId": edge["source"],
                            "reason": "Prerequisite for concepts you're currently learning",
                            "priority": "high",
                            "currentMastery": source_mastery,
                            "importance": 0.8
                        })
            
            # Remove duplicates and sort by priority
            unique_gaps = {}
            for gap in gaps:
                key = gap["conceptId"]
                if key not in unique_gaps or gap["priority"] == "high":
                    unique_gaps[key] = gap
            
            gaps_list = list(unique_gaps.values())
            gaps_list.sort(key=lambda x: x["importance"], reverse=True)
            
            critical_gaps = [gap for gap in gaps_list if gap["priority"] == "high"]
            
            # Generate suggested actions
            suggested_actions = self._generate_suggested_actions(gaps_list)
            
            return {
                "gaps": gaps_list[:10],  # Top 10 gaps
                "criticalGaps": critical_gaps,
                "totalGaps": len(gaps_list),
                "suggestedActions": suggested_actions
            }
        except Exception as e:
            logger.error(f"Gap detection error: {str(e)}")
            raise
    
    def _generate_suggested_actions(self, gaps: List[Dict]) -> List[str]:
        """Generate suggested actions based on detected gaps"""
        actions = []
        
        for gap in gaps[:5]:  # Top 5 gaps
            concept = gap["concept"]
            priority = gap["priority"]
            
            if priority == "high":
                actions.append(f"Urgent focus on {concept}")
            else:
                actions.append(f"Review {concept} basics")
        
        if not actions:
            actions.append("Continue current learning path")
        
        return actions
    
    async def get_concept_details(self, user_id: str, concept_id: str) -> Dict:
        """
        Get detailed information about a specific concept
        """
        try:
            graph = self.user_graphs.get(user_id, self._create_initial_graph(user_id))
            
            # Find concept
            concept = next((n for n in graph["nodes"] if n["id"] == concept_id), None)
            
            if not concept:
                raise ValueError(f"Concept {concept_id} not found")
            
            # Find related concepts
            related = []
            for edge in graph["edges"]:
                if edge["source"] == concept_id:
                    target = next((n for n in graph["nodes"] if n["id"] == edge["target"]), None)
                    if target:
                        related.append({
                            "name": target["name"],
                            "id": target["id"],
                            "relationship": edge["type"],
                            "strength": edge["strength"]
                        })
                elif edge["target"] == concept_id:
                    source = next((n for n in graph["nodes"] if n["id"] == edge["source"]), None)
                    if source:
                        related.append({
                            "name": source["name"],
                            "id": source["id"],
                            "relationship": edge["type"],
                            "strength": edge["strength"]
                        })
            
            return {
                "concept": concept,
                "relatedConcepts": related,
                "learningResources": self._get_learning_resources(concept["category"], concept["name"]),
                "prerequisites": [r for r in related if r["relationship"] == "prerequisite"],
                "applications": [r for r in related if r["relationship"] == "applies-to"]
            }
        except Exception as e:
            logger.error(f"Get concept details error: {str(e)}")
            raise
    
    def _get_learning_resources(self, category: str, concept: str) -> List[str]:
        """Get learning resources for a concept"""
        # In production, fetch from database or external APIs
        return [
            f"Video: {concept} - Introduction",
            f"Practice Problems: {concept}",
            f"Notes: {concept} Summary",
            f"Quiz: {concept} Assessment"
        ]
