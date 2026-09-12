# RFC-002: Domain-Driven Design (DDD) Knowledge Graph SuperSpec Specification

## Status
*   **Status:** Proposed
*   **Author:** Architecture Core Team
*   **Created:** 2026-09-12
*   **Dependencies:** RFC-001

## 1. Abstract & Context
This RFC outlines the architectural implementation of the **SuperSpec** within **Layer 2 (The Orchestrator)**. To safeguard against context limitation degradation during massive code updates, the system specification is engineered as a strict graph network mapped directly onto Domain-Driven Design (DDD) constructs.

## 2. Technical Specification

### 2.1 Graph Database Choice & Ontology
We define the SuperSpec using an open graph data structure layout. The schema uses Neo4j Cypher conventions for defining transactional structures:

```
Nodes:
  - BoundedContext { name: STR, summary: TEXT }
  - AggregateRoot { name: STR, root_identifier: STR }
  - Entity        { name: STR, attributes: LIST[STR] }
  - DomainEvent   { name: STR, schema_definition: TEXT }
  - Invariant     { name: STR, rule_logic: TEXT }

Relationships:
  - (:BoundedContext)-[:CONTAINS]->(:AggregateRoot)
  - (:AggregateRoot)-[:ENCAPSULATES]->(:Entity)
  - (:AggregateRoot)-[:EMITS]->(:DomainEvent)
  - (:Entity)-[:MUST_SATISFY]->(:Invariant)
  - (:BoundedContext)-[:CONTEXT_MAP { type: "UPSTREAM" | "DOWNSTREAM" }]->(:BoundedContext)
```

### 2.2 Spec-to-Code Context Extraction Pipeline
When a feature is dispatched to Layer 3, the Orchestrator avoids passing raw text. It executes graph traversals to construct the target context payload:

```python
def extract_subgraph_context(graph_driver, target_aggregate: str) -> dict:
    """
    Queries the master SuperSpec Neo4j graph database to extract a bounded 
    subgraph structure for a single Aggregate Root.
    """
    query = """
    MATCH (a:AggregateRoot {name: $aggregate_name})
    OPTIONAL MATCH (a)-[r:ENCAPSULATES]->(e:Entity)
    OPTIONAL MATCH (e)-[i:MUST_SATISFY]->(inv:Invariant)
    RETURN a, collect(e) as entities, collect(inv) as invariants
    """
    with graph_driver.session() as session:
        result = session.run(query, aggregate_name=target_aggregate)
        return serialize_to_minimal_json(result)
```

### 2.3 Code-to-Spec Reverse Sync Validation
If changes made by an active agent alter data payloads or introduce field properties, the output pipeline converts AST shifts back into graph mutations:
1. **AST Extraction:** Extract structural type maps using parsing layers (`tsc` for TypeScript or native `ast` modules for Python).
2. **Graph Difference Check:** Compare extracted schema models with node parameters presently stored inside the graph.
3. **Encapsulation Validation:** Enforce an invariant check loop ensuring cross-bounded context boundaries aren't leaked.

---

## 3. Implementation Drawbacks & Alternatives
*   *Alternative:* Managing specs using thousands of files inside a directory tree. *Rejected* because text parsing cannot scale to thousands of dependent paths without causing prompt context bloat.

## 4. Open Questions
1. How do we cleanly represent deep relational layout properties inside structural entities without complicating graph property structures?
