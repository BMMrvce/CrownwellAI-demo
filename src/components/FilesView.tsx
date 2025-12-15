import { useState, useCallback } from 'react'

interface RCAReport {
  id: number
  rca_id: string
  part_number: string
  description?: string
  severity: string
  detection_stage: string
  batch_number: string
  serial_number?: string
  problem_description: string
  problem_detected_date?: string
  containment_actions: string
  containment_effective?: boolean
  whys?: string[]
  root_cause_category?: string
  corrective_actions: string
  corrective_actions_owner?: string
  implementation_status: string
  validation_successful?: boolean
  preventive_measures: string
  closure_status: string
  qa_approved: boolean
  engineering_approved: boolean
  created_at: string
}

interface WorkOrder {
  id: number
  wo_number: string
  wo_type?: string
  part_number: string
  part_description?: string
  quantity: number
  unit?: string
  status: string
  priority?: string
  customer_name?: string
  customer_po_number?: string
  sales_order_number?: string
  start_date?: string
  due_date?: string
  completion_date?: string
  current_operation?: string
  current_workstation?: string
  operators_assigned?: string[]
  notes?: string
  special_instructions?: string
  completion_percentage?: number
  created_at: string
}

interface FileItem {
  id: string
  name: string
  type: 'rca-reports' | 'work-orders'
  table: 'rca_8d_reports' | 'work_orders'
}

interface FileListItem {
  id: number
  name: string
  content: RCAReport | WorkOrder
}
 
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const ITEMS_PER_PAGE = 1000

const folders: FileItem[] = [
  { id: 'rca-reports', name: 'RCA 8D Reports', type: 'rca-reports', table: 'rca_8d_reports' },
  { id: 'work-orders', name: 'Work Orders', type: 'work-orders', table: 'work_orders' }
]

export default function FilesView({ onFileSelect }: { onFileSelect?: (title: string, fileType: string) => void }) {
  const [selectedFolder, setSelectedFolder] = useState<FileItem | null>(null)
  const [files, setFiles] = useState<FileListItem[]>([])
  const [selectedFile, setSelectedFile] = useState<FileListItem | null>(null)
  // Paging disabled: keep single scrollable list
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState<RCAReport | WorkOrder | null>(null)
  const [saving, setSaving] = useState(false)

  const loadFiles = useCallback(async (folder: FileItem, page: number, search: string) => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Loading files from folder:', folder.name, 'Page:', page)
      
      const offset = (page - 1) * ITEMS_PER_PAGE
      
      // Build query URL with pagination
      let url = `${SUPABASE_URL}/rest/v1/${folder.table}?select=*&order=created_at.desc&limit=${ITEMS_PER_PAGE}&offset=${offset}`
      
      // Add search filter if present
      if (search.trim()) {
        if (folder.type === 'rca-reports') {
          url += `&or=(rca_id.ilike.*${search}*,part_number.ilike.*${search}*,problem_description.ilike.*${search}*)`
        } else {
          url += `&or=(wo_number.ilike.*${search}*,part_number.ilike.*${search}*,customer_name.ilike.*${search}*)`
        }
      }
      
      // Fetch data
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'count=exact'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to fetch files:', response.status, errorText)
        throw new Error(`Failed to fetch files: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Get total count from header
      const contentRange = response.headers.get('content-range')
      const total = contentRange ? parseInt(contentRange.split('/')[1]) : data.length
      
      console.log('✅ Loaded files:', data.length, 'Total:', total)
      
      // Map to FileListItem
      const fileItems: FileListItem[] = data.map((item: RCAReport | WorkOrder) => ({
        id: item.id,
        name: folder.type === 'rca-reports' ? (item as RCAReport).rca_id : (item as WorkOrder).wo_number,
        content: item
      }))
      
      setFiles(fileItems)
      setTotalCount(total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('❌ Error loading files:', err)
      setError(errorMessage)
      setFiles([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFolderClick = useCallback((folder: FileItem) => {
    setSelectedFolder(folder)
    setSelectedFile(null)
    setSearchQuery('')
    setIsEditing(false)
    loadFiles(folder, 1, '')
  }, [loadFiles])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (selectedFolder) {
      loadFiles(selectedFolder, 1, query)
    }
  }, [selectedFolder, loadFiles])

  const handleFileClick = useCallback((file: FileListItem) => {
    setSelectedFile(file)
    setEditedContent(file.content)
    setIsEditing(false)
    
    // Notify parent of file selection with title
    if (onFileSelect) {
      const isRCA = 'rca_id' in file.content
      const title = isRCA ? (file.content as RCAReport).rca_id : (file.content as WorkOrder).wo_number
      const fileType = isRCA ? 'RCA' : 'WO'
      onFileSelect(title, fileType)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedFile || !editedContent || !selectedFolder) return
    
    try {
      setSaving(true)
      console.log('💾 Saving changes to database...')
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${selectedFolder.table}?id=eq.${selectedFile.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(editedContent)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to save:', response.status, errorText)
        throw new Error(`Failed to save: ${response.status}`)
      }
      
      const updatedData = await response.json()
      console.log('✅ Saved successfully:', updatedData)
      
      // Update local state
      setSelectedFile({
        ...selectedFile,
        content: updatedData[0]
      })
      
      // Update files list
      setFiles(prevFiles => 
        prevFiles.map(f => f.id === selectedFile.id ? { ...f, content: updatedData[0] } : f)
      )
      
      setIsEditing(false)
      alert('Changes saved successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('❌ Error saving:', err)
      alert(`Failed to save: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }, [selectedFile, editedContent, selectedFolder])

  const renderEditableField = (label: string, value: string | number | undefined, field: string, multiline = false) => {
    if (!isEditing) {
      return (
        <p>
          <span className="text-slate-400">{label}:</span>{' '}
          <span className="text-slate-100">{value || 'N/A'}</span>
        </p>
      )
    }

    if (multiline) {
      return (
        <div>
          <label className="text-slate-400 block mb-1">{label}:</label>
          <textarea
            value={String(value || '')}
            onChange={(e) => setEditedContent(prev => prev ? { ...prev, [field]: e.target.value } : null)}
            className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded px-3 py-2 min-h-[100px]"
          />
        </div>
      )
    }

    return (
      <div>
        <label className="text-slate-400 block mb-1">{label}:</label>
        <input
          type="text"
          value={String(value || '')}
          onChange={(e) => setEditedContent(prev => prev ? { ...prev, [field]: e.target.value } : null)}
          className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded px-3 py-2"
        />
      </div>
    )
  }

  const renderFileContent = (content: RCAReport | WorkOrder | undefined) => {
    if (!content) return null

    // Determine if it's an RCA report or Work Order
    const isRCA = 'rca_id' in content
    
    if (isRCA) {
      const rcaContent = content as RCAReport
      return (
        <div className="space-y-6">
          <div className="border-b border-slate-700 pb-4">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">{rcaContent.rca_id}</h2>
            <p className="text-slate-400">Part Number: {rcaContent.part_number}</p>
            {rcaContent.description && <p className="text-slate-400">{rcaContent.description}</p>}
          </div>

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Problem Information</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              {renderEditableField('Severity', rcaContent.severity, 'severity')}
              {renderEditableField('Detection Stage', rcaContent.detection_stage, 'detection_stage')}
              {renderEditableField('Batch Number', rcaContent.batch_number, 'batch_number')}
              {renderEditableField('Serial Number', rcaContent.serial_number, 'serial_number')}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">D2: Problem Description</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              {renderEditableField('Problem Description', rcaContent.problem_description, 'problem_description', true)}
              {rcaContent.problem_detected_date && !isEditing && (
                <p className="text-slate-400 mt-2">Detected: {new Date(rcaContent.problem_detected_date).toLocaleDateString()}</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">D3: Containment Actions</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              {renderEditableField('Containment Actions', rcaContent.containment_actions, 'containment_actions', true)}
              {rcaContent.containment_effective !== undefined && !isEditing && (
                <p className="text-slate-400 mt-2">Effective: {rcaContent.containment_effective ? 'Yes' : 'No'}</p>
              )}
            </div>
          </section>

          {rcaContent.whys && rcaContent.whys.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">D4: Root Cause Analysis (5-Why)</h3>
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                {rcaContent.whys.map((why: string, index: number) => (
                  <p key={index} className="text-slate-100">
                    <span className="text-slate-400 font-medium">Why {index + 1}:</span> {why}
                  </p>
                ))}
                {rcaContent.root_cause_category && (
                  <p className="text-slate-400 mt-3">Category: <span className="text-slate-100">{rcaContent.root_cause_category}</span></p>
                )}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">D5: Corrective Actions</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              {renderEditableField('Corrective Actions', rcaContent.corrective_actions, 'corrective_actions', true)}
              {renderEditableField('Owner', rcaContent.corrective_actions_owner, 'corrective_actions_owner')}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">D6: Implementation Status</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              {renderEditableField('Implementation Status', rcaContent.implementation_status, 'implementation_status', true)}
              {rcaContent.validation_successful !== undefined && !isEditing && (
                <p className="text-slate-400 mt-2">Validation: {rcaContent.validation_successful ? 'Successful' : 'Failed'}</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">D7: Preventive Measures</h3>
            <div className="bg-slate-800/50 rounded-lg p-4">
              {renderEditableField('Preventive Measures', rcaContent.preventive_measures, 'preventive_measures', true)}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">D8: Closure & Approvals</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              <p><span className="text-slate-400">Status:</span> <span className="text-slate-100">{rcaContent.closure_status}</span></p>
              <p><span className="text-slate-400">QA Approved:</span> <span className="text-slate-100">{rcaContent.qa_approved ? 'Yes' : 'No'}</span></p>
              <p><span className="text-slate-400">Engineering Approved:</span> <span className="text-slate-100">{rcaContent.engineering_approved ? 'Yes' : 'No'}</span></p>
            </div>
          </section>
        </div>
      )
    } else {
      // Work Order
      const woContent = content as WorkOrder
      return (
        <div className="space-y-6">
          <div className="border-b border-slate-700 pb-4">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">{woContent.wo_number}</h2>
            <p className="text-slate-400">Part Number: {woContent.part_number}</p>
            {woContent.part_description && <p className="text-slate-400">{woContent.part_description}</p>}
          </div>

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Order Details</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              {renderEditableField('Status', woContent.status, 'status')}
              {renderEditableField('Type', woContent.wo_type, 'wo_type')}
              {renderEditableField('Priority', woContent.priority, 'priority')}
              {renderEditableField('Quantity', woContent.quantity, 'quantity')}
              {renderEditableField('Unit', woContent.unit, 'unit')}
              {woContent.completion_percentage && !isEditing && (
                <p><span className="text-slate-400">Completion:</span> <span className="text-slate-100">{woContent.completion_percentage}%</span></p>
              )}
            </div>
          </section>

          {woContent.customer_name && (
            <section>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Customer Information</h3>
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                <p><span className="text-slate-400">Customer:</span> <span className="text-slate-100">{woContent.customer_name}</span></p>
                {woContent.customer_po_number && <p><span className="text-slate-400">PO Number:</span> <span className="text-slate-100">{woContent.customer_po_number}</span></p>}
                {woContent.sales_order_number && <p><span className="text-slate-400">Sales Order:</span> <span className="text-slate-100">{woContent.sales_order_number}</span></p>}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Schedule</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              {woContent.start_date && <p><span className="text-slate-400">Start Date:</span> <span className="text-slate-100">{new Date(woContent.start_date).toLocaleDateString()}</span></p>}
              {woContent.due_date && <p><span className="text-slate-400">Due Date:</span> <span className="text-slate-100">{new Date(woContent.due_date).toLocaleDateString()}</span></p>}
              {woContent.completion_date && <p><span className="text-slate-400">Completed:</span> <span className="text-slate-100">{new Date(woContent.completion_date).toLocaleDateString()}</span></p>}
            </div>
          </section>

          {woContent.current_operation && (
            <section>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Production Status</h3>
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                <p><span className="text-slate-400">Current Operation:</span> <span className="text-slate-100">{woContent.current_operation}</span></p>
                {woContent.current_workstation && <p><span className="text-slate-400">Workstation:</span> <span className="text-slate-100">{woContent.current_workstation}</span></p>}
                {woContent.operators_assigned && woContent.operators_assigned.length > 0 && (
                  <p><span className="text-slate-400">Operators:</span> <span className="text-slate-100">{woContent.operators_assigned.join(', ')}</span></p>
                )}
              </div>
            </section>
          )}

          {(woContent.notes || woContent.special_instructions || isEditing) && (
            <section>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Notes</h3>
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                {renderEditableField('Special Instructions', woContent.special_instructions, 'special_instructions', true)}
                {renderEditableField('Notes', woContent.notes, 'notes', true)}
              </div>
            </section>
          )}
        </div>
      )
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
      {/* Folders Sidebar */}
      <div className="w-64 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-y-auto scrollbar-custom">
        <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]">
          <h2 className="text-[var(--text-primary)] font-semibold">Folders</h2>
        </div>
        <div className="py-2">
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className={`flex items-center gap-2 px-4 py-3 hover:bg-[color:rgba(37,99,235,0.08)] w-full text-left transition-colors ${
                selectedFolder?.id === folder.id ? 'bg-[color:rgba(37,99,235,0.12)] border-l-2 border-[var(--accent)]' : ''
              }`}
            >
              <svg className="w-5 h-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="text-[var(--text-primary)] font-medium">{folder.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Files List */}
      {selectedFolder && (
        <div className="w-96 min-w-[18rem] border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden min-h-0 min-w-0 scrollbar-custom">
          <div className="p-4 border-b border-[var(--border-primary)] shrink-0 bg-[var(--bg-primary)]">
            <h2 className="text-[var(--text-primary)] font-semibold mb-3">{selectedFolder.name}</h2>
            
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 pl-10"
              />
              <svg className="w-5 h-5 text-[var(--text-secondary)] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <p className="text-[var(--text-secondary)] text-sm mt-2">
              {totalCount} file{totalCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Files */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg-secondary)] scrollbar-custom" style={{ scrollbarGutter: 'stable', overscrollBehavior: 'contain', maxHeight: 'calc(100vh - 200px)' }}>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            ) : files.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-[var(--text-secondary)] text-sm">No files found</p>
              </div>
            ) : (
              <div className="py-2">
                {files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-[color:rgba(37,99,235,0.08)] w-full text-left transition-colors ${
                      selectedFile?.id === file.id ? 'bg-[color:rgba(37,99,235,0.12)] border-l-2 border-[var(--accent)]' : ''
                    }`}
                  >
                    <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[var(--text-primary)] truncate text-sm">{file.name}.md</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagination hidden: load all into scrollable list */}
        </div>
      )}

      {/* File Preview */}
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">

        {selectedFile ? (
        <div className="h-full flex flex-col overflow-hidden min-h-0 scrollbar-custom">

            {/* Header with Edit/Save buttons */}
            <div className="sticky top-0 bg-[var(--bg-secondary)]/95 backdrop-blur-sm border-b border-[var(--border-primary)] p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedFile.name}.md</h2>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditedContent(selectedFile.content)
                      }}
                      className="px-4 py-2 text-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:brightness-110 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
           <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-[var(--bg-secondary)] text-[var(--text-primary)] scrollbar-custom" style={{ scrollbarGutter: 'stable', overscrollBehavior: 'contain', maxHeight: 'calc(100vh - 200px)' }}>

              <div className="max-w-4xl mx-auto space-y-6">
                {editedContent && renderFileContent(editedContent)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[var(--text-secondary)] text-lg">
                {selectedFolder ? 'Select a file to view its contents' : 'Select a folder to view files'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

