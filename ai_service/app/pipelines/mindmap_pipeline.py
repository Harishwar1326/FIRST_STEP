import networkx as nx
# pyrefly: ignore [missing-import]
import spacy
from typing import Dict, List
import logging

logger = logging.getLogger("ai_service")

class MindMapPipeline:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
    
    async def generate(self, note_id: str, concepts: List[str], relationships: List[Dict]) -> Dict:
        """
        Generate interactive mind map structure
        """
        try:
            # Create graph
            G = nx.DiGraph()
            
            # Add concept nodes
            for concept in concepts:
                G.add_node(concept, type="concept")
            
            # Add relationship edges
            for rel in relationships:
                if rel["source"] in G.nodes() and rel["target"] in G.nodes():
                    G.add_edge(rel["source"], rel["target"], type=rel["type"])
            
            # Calculate layout
            pos = nx.spring_layout(G, k=2, iterations=50)
            
            # Convert to React Flow format
            nodes = []
            edges = []
            
            for node, position in pos.items():
                nodes.append({
                    "id": node,
                    "data": {"label": node},
                    "position": {"x": position[0] * 200, "y": position[1] * 200},
                    "type": "default"
                })
            
            for source, target, data in G.edges(data=True):
                edges.append({
                    "id": f"{source}-{target}",
                    "source": source,
                    "target": target,
                    "label": data.get("type", ""),
                    "animated": True
                })
            
            # Add hierarchical structure
            hierarchy = self._build_hierarchy(G)
            
            return {
                "nodes": nodes,
                "edges": edges,
                "layout": "force-directed",
                "hierarchy": hierarchy
            }
            
        except Exception as e:
            logger.error(f"Mind map generation error: {str(e)}")
            raise
    
    def _build_hierarchy(self, G: nx.DiGraph) -> Dict:
        """Build hierarchical structure from graph"""
        hierarchy = {
            "root": None,
            "branches": []
        }
        
        # Find root node (node with most connections)
        if G.number_of_nodes() > 0:
            degrees = dict(G.degree())
            root = max(degrees, key=degrees.get)
            hierarchy["root"] = root
            
            # Build branches
            for node in G.nodes():
                if node != root:
                    hierarchy["branches"].append({
                        "node": node,
                        "parent": list(G.predecessors(node))[0] if list(G.predecessors(node)) else root
                    })
        
        return hierarchy
