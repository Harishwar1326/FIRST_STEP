import { useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Loader2, Network, Search } from 'lucide-react'
import ReactFlow, { Background, Controls, MiniMap, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import { forestService } from '../../services/forestService'

const KnowledgeForestPage = () => {
  const [query, setQuery] = useState('')
  const [conceptMap, setConceptMap] = useState(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState('')
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [entityDetails, setEntityDetails] = useState(null)
  const [entityDetailsLoading, setEntityDetailsLoading] = useState(false)
  const entityRequestId = useRef(0)

  const graphNodes = useMemo(() => {
    if (!conceptMap?.nodes?.length) return []
    const mainId = conceptMap.nodes.find((node) => node.label.toLowerCase() === conceptMap.mainConcept?.toLowerCase())?.id
    const related = conceptMap.nodes.filter((node) => node.id !== mainId)
    const centerX = 420
    const centerY = 260
    const radius = Math.min(230, 95 + related.length * 18)
    return conceptMap.nodes.map((node) => {
      const isMain = node.id === mainId
      const index = related.findIndex((item) => item.id === node.id)
      const angle = related.length ? (index / related.length) * Math.PI * 2 - Math.PI / 2 : 0
      return {
        id: node.id,
        data: { label: node.label, type: node.type, definition: node.definition },
        position: isMain ? { x: centerX, y: centerY } : { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius },
        style: {
          width: isMain ? 180 : 150,
          borderRadius: 16,
          border: `2px solid ${isMain ? 'var(--color-accent)' : 'var(--color-border)'}`,
          background: isMain ? 'var(--color-accent)' : 'var(--color-surface)',
          color: isMain ? 'white' : 'var(--color-text)',
          padding: 12,
          fontWeight: 800,
          textAlign: 'center',
          boxShadow: isMain ? '0 12px 28px rgba(124,92,255,.22)' : '0 8px 20px rgba(20,20,20,.08)',
        },
      }
    })
  }, [conceptMap])

  const graphEdges = useMemo(() => (conceptMap?.edges || []).map((edge) => ({
    ...edge,
    label: edge.label,
    type: 'smoothstep',
    animated: selectedEntity ? edge.source === selectedEntity.id || edge.target === selectedEntity.id : false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: selectedEntity && edge.source !== selectedEntity.id && edge.target !== selectedEntity.id ? '#d6d3d1' : 'var(--color-accent)', strokeWidth: selectedEntity && (edge.source === selectedEntity.id || edge.target === selectedEntity.id) ? 3 : 1.5 },
    labelStyle: { fontSize: 10, fontWeight: 800, fill: 'var(--color-secondary)' },
    labelBgStyle: { fill: 'var(--color-surface)', fillOpacity: 0.9 },
  })), [conceptMap, selectedEntity])

  const generateConceptMap = async () => {
    const concept = query.trim()
    if (!concept) {
      setMapError('Enter a concept first, such as thermodynamics or genetics.')
      return
    }
    setMapLoading(true)
    setMapError('')
    try {
      const result = await forestService.generateConceptMap(concept)
      setConceptMap(result)
      setSelectedEntity(null)
      setEntityDetails(null)
    } catch (error) {
      setMapError(error.response?.data?.message || 'Could not build the relationship map right now.')
    } finally {
      setMapLoading(false)
    }
  }

  const selectEntity = async (entity) => {
    if (!entity || !conceptMap) return
    const requestId = ++entityRequestId.current
    setSelectedEntity(entity)
    setEntityDetails(null)
    setEntityDetailsLoading(true)
    window.requestAnimationFrame(() => document.getElementById('forest-entity-details')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    const connectedEntities = conceptMap.edges
      .filter((edge) => edge.source === entity.id || edge.target === entity.id)
      .map((edge) => {
        const otherId = edge.source === entity.id ? edge.target : edge.source
        const other = conceptMap.nodes.find((node) => node.id === otherId)
        return other ? { name: other.label, relationship: edge.label, explanation: edge.explanation } : null
      })
      .filter(Boolean)
    try {
      const details = await forestService.getEntityDetails({
        concept: conceptMap.mainConcept,
        entity: entity.label || entity.name,
        type: entity.type,
        definition: entity.definition,
        connectedEntities,
      })
      if (requestId === entityRequestId.current) setEntityDetails(details)
    } catch {
      // Keep the definition already present in the generated map if detail lookup is unavailable.
      if (requestId === entityRequestId.current) setEntityDetails(null)
    } finally {
      if (requestId === entityRequestId.current) setEntityDetailsLoading(false)
    }
  }

  return (
    <div className="world-page knowledge-forest-page">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge tone="accent">Knowledge Forest</Badge>
          <h1 className="mt-4 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-6xl">
            Visual concept map.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
            Explore relationships between concepts, identify weak branches, and choose the next idea to grow.
          </p>
        </div>
        <label className="flex w-full items-center gap-3 rounded-2xl border border-app bg-surface px-4 py-3 lg:max-w-sm">
          <Search size={18} className="text-muted" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm font-bold text-primary outline-none placeholder:text-muted"
            placeholder="Search concepts..."
          />
        </label>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[.78fr_1.22fr]">
        <Card className="self-start p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
            <Network size={24} strokeWidth={1.7} />
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-muted">From your study material</p>
          <h2 className="mt-2 font-display text-2xl font-black text-primary">Map one concept</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-secondary">
            Enter a concept and FirstStep will expand it with Gemini, extract useful entities, and connect the ideas into an interactive map.
          </p>
          <div className="mt-5 flex gap-2 rounded-xl border border-app bg-elevated p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') generateConceptMap() }}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm font-bold text-primary outline-none placeholder:text-muted"
              placeholder="e.g. photosynthesis"
            />
            <button type="button" onClick={generateConceptMap} disabled={mapLoading} className="rounded-lg bg-accent px-3 py-2 text-stone-950 transition hover:opacity-90 disabled:opacity-60" aria-label="Generate concept map">
              {mapLoading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
            </button>
          </div>
          {mapError && <p className="mt-3 flex items-start gap-2 text-xs font-bold text-rose-700"><AlertCircle size={15} className="shrink-0" />{mapError}</p>}
        </Card>

        <Card className="min-h-[260px] p-6">
          {!conceptMap ? (
            <div className="flex min-h-[210px] flex-col items-center justify-center text-center">
              <Network size={34} className="text-muted" strokeWidth={1.4} />
              <p className="mt-4 font-display text-xl font-black text-primary">Your relationship map will grow here</p>
              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-secondary">Search a concept to see the people, places, ideas, organisations, and topics connected to it in your notes.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Entity relationship map</p><h2 className="mt-1 font-display text-2xl font-black text-primary">{conceptMap.mainConcept || 'Study material'}</h2></div>
                <div className="flex gap-2 text-xs font-black text-secondary"><span className="rounded-full bg-elevated px-3 py-1.5">{conceptMap.entityCount || 0} entities</span><span className="rounded-full bg-elevated px-3 py-1.5">{conceptMap.relationshipCount || 0} links</span></div>
              </div>
              {conceptMap.processingWarning && <p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900">{conceptMap.processingWarning}</p>}
              {graphNodes.length ? <div className="relative mt-5 h-[520px] overflow-hidden rounded-xl border border-app bg-elevated"><ReactFlow nodes={graphNodes} edges={graphEdges} fitView minZoom={0.35} maxZoom={1.7} onNodeClick={(_, node) => selectEntity(conceptMap.nodes.find((item) => item.id === node.id))}><MiniMap pannable zoomable nodeColor="var(--color-accent)" /><Controls /><Background gap={24} size={1} /></ReactFlow></div> : <p className="mt-6 text-sm font-bold text-secondary">No entities were returned for this concept.</p>}
              {selectedEntity && (() => {
                const relationships = conceptMap.edges.filter((edge) => edge.source === selectedEntity.id || edge.target === selectedEntity.id).map((edge) => {
                  const otherId = edge.source === selectedEntity.id ? edge.target : edge.source
                  return { edge, other: conceptMap.nodes.find((node) => node.id === otherId) }
                })
                return <div id="forest-entity-details" role="status" aria-live="polite" className="mt-4 scroll-mt-6 rounded-xl border border-accent/30 bg-accent/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-accent">Entity details</p><h3 className="mt-1 text-lg font-black text-primary">{selectedEntity.name || selectedEntity.label}</h3><p className="text-xs font-bold text-secondary">{selectedEntity.type}</p></div>
                    <div className="flex items-center gap-3">{entityDetailsLoading && <Loader2 size={16} className="animate-spin text-accent" aria-label="Loading entity details" />}<button type="button" onClick={() => { entityRequestId.current += 1; setSelectedEntity(null); setEntityDetails(null); setEntityDetailsLoading(false) }} className="text-xs font-black text-secondary">Close</button></div>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-secondary">{entityDetails?.definition || selectedEntity.definition || 'Looking up a definition for this entity…'}</p>
                  {entityDetails?.warning && <p role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">{entityDetails.warning}</p>}
                  {entityDetails?.whyRelated && <p className="mt-3 rounded-lg bg-surface/70 p-3 text-sm font-semibold leading-6 text-secondary"><b className="text-primary">Why it is related: </b>{entityDetails.whyRelated}</p>}
                  {(entityDetails?.examples?.length || selectedEntity.examples?.length) > 0 && <div className="mt-3"><p className="text-[10px] font-black uppercase tracking-wider text-muted">Examples</p><ul className="mt-1 list-inside list-disc text-sm font-semibold text-secondary">{(entityDetails?.examples?.length ? entityDetails.examples : selectedEntity.examples).map((example, index) => <li key={`${example}-${index}`}>{example}</li>)}</ul></div>}
                  {entityDetails?.keyFacts?.length > 0 && <div className="mt-3"><p className="text-[10px] font-black uppercase tracking-wider text-muted">Key facts</p><ul className="mt-1 list-inside list-disc text-sm font-semibold text-secondary">{entityDetails.keyFacts.map((fact, index) => <li key={`${fact}-${index}`}>{fact}</li>)}</ul></div>}
                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Connected entities</p>
                    {relationships.length ? <div className="mt-2 flex flex-wrap gap-2">{relationships.map(({ edge, other }) => other && <button key={edge.id} type="button" onClick={() => selectEntity(other)} title={edge.explanation || `${edge.label} ${other.label}`} className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-secondary transition hover:text-primary"><span className="text-accent">{edge.label}:</span> {other.label}</button>)}</div> : <p className="mt-2 text-sm font-semibold text-secondary">No connected entities were returned.</p>}
                    {relationships.some(({ edge }) => edge.explanation) && <div className="mt-3 space-y-1">{relationships.filter(({ edge }) => edge.explanation).map(({ edge, other }) => <p key={`${edge.id}-explanation`} className="text-xs font-semibold text-secondary"><b>{edge.label}{other ? ` ${other.label}` : ''}:</b> {edge.explanation}</p>)}</div>}
                  </div>
                </div>
              })()}
            </>
          )}
        </Card>
      </section>
    </div>
  )
}

export default KnowledgeForestPage
