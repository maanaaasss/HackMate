'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Loader2, GripVertical, Trash2, Plus } from 'lucide-react'

type RubricItem = {
  id: string
  label: string
  description?: string
  max_score: number
  weight: number
  sort_order: number
}

type RubricBuilderProps = {
  hackathonId: string
  initialRubric?: {
    id: string
    hackathon_id: string
    rubric_items: RubricItem[]
  }
}

const defaultItems: Omit<RubricItem, 'id'>[] = [
  { label: 'Innovation', description: 'Creativity and originality of the idea', max_score: 10, weight: 40, sort_order: 0 },
  { label: 'Technical Implementation', description: 'Implementation quality, code structure, and technical complexity', max_score: 10, weight: 40, sort_order: 1 },
  { label: 'Presentation', description: 'Clarity of demo, pitch, and overall presentation', max_score: 10, weight: 20, sort_order: 2 },
]

function SortableItem({
  item,
  isSelected,
  onSelect,
  onDelete,
}: {
  item: RubricItem
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-3 border rounded-md cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <button
        className="cursor-grab touch-none p-1 text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <div className="flex-1 ml-3">
        <div className="font-medium text-gray-900">{item.label}</div>
        <div className="text-sm text-gray-500">
          Max score: {item.max_score}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {item.weight}%
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-gray-400 hover:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function RubricBuilder({ hackathonId, initialRubric }: RubricBuilderProps) {
  const router = useRouter()
  const [items, setItems] = useState<RubricItem[]>(() => {
    if (initialRubric?.rubric_items) {
      return initialRubric.rubric_items.sort((a, b) => a.sort_order - b.sort_order)
    }
    return defaultItems.map((item, index) => ({
      ...item,
      id: `temp-${index}`,
      sort_order: index,
    }))
  })
  
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null)
  const [isSaving, setIsSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  const isValid = totalWeight === 100
  const hasUnsavedChanges = items.length > 0

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        return newItems.map((item, index) => ({ ...item, sort_order: index }))
      })
    }
  }

  const addItem = () => {
    const newId = `temp-${Date.now()}`
    const newItem: RubricItem = {
      id: newId,
      label: '',
      description: '',
      max_score: 10,
      weight: 0,
      sort_order: items.length,
    }
    setItems([...items, newItem])
    setSelectedId(newId)
  }

  const updateItem = (id: string, updates: Partial<RubricItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  const deleteItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('You must have at least one criterion')
      return
    }
    
    const item = items.find(i => i.id === id)
    if (item && !item.id.startsWith('temp-')) {
      if (!confirm('Are you sure you want to delete this criterion? This action cannot be undone.')) {
        return
      }
    }
    
    setItems(items.filter(item => item.id !== id))
    if (selectedId === id) {
      setSelectedId(items[0]?.id || null)
    }
  }

  const saveRubric = async () => {
    if (!isValid) {
      toast.error('Total weight must equal 100%')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathon_id: hackathonId,
          items: items.map(({ id: _, ...rest }) => rest), // Remove temporary IDs
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save rubric')
      }

      toast.success('Rubric saved. Judges will see these criteria.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save rubric')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedItem = items.find(item => item.id === selectedId)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Rubric Builder</h1>
            <p className="text-gray-600 mb-8">
              Define scoring criteria for judges. Drag to reorder, click to edit.
            </p>

            {/* Weight Indicator */}
            <div className="mb-8">
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="text-gray-700">Total Weight</span>
                <span className={`font-bold ${
                  totalWeight === 100 ? 'text-green-600' : 
                  totalWeight > 100 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {totalWeight}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    totalWeight === 100 ? 'bg-green-500' : 
                    totalWeight > 100 ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min(totalWeight, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {totalWeight === 100 
                  ? '✓ Ready to save'
                  : `Must equal 100% to save (currently ${totalWeight}%)`
                }
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Panel - Sortable List */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Scoring Criteria</h2>
                  <button
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Criterion
                  </button>
                </div>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {items.map((item) => (
                        <SortableItem
                          key={item.id}
                          item={item}
                          isSelected={selectedId === item.id}
                          onSelect={() => setSelectedId(item.id)}
                          onDelete={() => deleteItem(item.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {/* Right Panel - Edit Item */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedItem ? 'Edit Criterion' : 'Select a criterion to edit'}
                </h2>
                
                {selectedItem && (
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                        Label *
                      </label>
                      <input
                        id="label"
                        type="text"
                        value={selectedItem.label}
                        onChange={(e) => updateItem(selectedItem.id, { label: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Innovation"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description (shown to judges)
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        value={selectedItem.description || ''}
                        onChange={(e) => updateItem(selectedItem.id, { description: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Describe what this criterion evaluates..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="max_score" className="block text-sm font-medium text-gray-700">
                          Max Score
                        </label>
                        <input
                          id="max_score"
                          type="number"
                          min={1}
                          max={100}
                          value={selectedItem.max_score}
                          onChange={(e) => updateItem(selectedItem.id, { max_score: parseInt(e.target.value) || 10 })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                          Weight (%)
                        </label>
                        <input
                          id="weight"
                          type="number"
                          min={1}
                          max={100}
                          value={selectedItem.weight}
                          onChange={(e) => updateItem(selectedItem.id, { weight: parseInt(e.target.value) || 0 })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={() => deleteItem(selectedItem.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete this criterion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={saveRubric}
                disabled={!isValid || isSaving || !hasUnsavedChanges}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Rubric
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}