import { IconClockHour4, IconMessage, IconRobot, IconFileText } from '@tabler/icons-react'

interface ReportPreviewProps {
  title: string
  userMessages: string[]
  assistantMessages: string[]
  modelLabel: string
  tables: Array<{ headers: string[], rows: any[][] }>
}

export default function ReportPreview({ title, userMessages, assistantMessages, modelLabel }: ReportPreviewProps) {
  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-secondary)] text-[var(--text-primary)] print:bg-white transition-colors duration-200 scrollbar-custom">
      {/* Professional Report Container */}
      <div className="max-w-6xl mx-auto py-8 px-6 space-y-8">
        
        {/* Header Section */}
        <div className="bg-[var(--bg-primary)] rounded-2xl shadow-lg p-8 border-l-8 border-[var(--accent)] print:shadow-none print:border-l-4 transition-colors duration-200">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[var(--accent)] rounded-xl flex items-center justify-center">
                  <IconFileText size={28} className="text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--accent)] font-bold">Crownwell AI Analysis Report</p>
                  <h1 className="text-3xl font-bold text-[var(--text-primary)] transition-colors duration-200">{title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mt-4 transition-colors duration-200">
                <div className="flex items-center gap-2">
                  <IconClockHour4 size={16} />
                  <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => window.print()} 
              className="px-6 py-3 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white font-semibold shadow-lg hover:shadow-xl transition-all print:hidden"
            >
              Export to PDF
            </button>
          </div>
        </div>

        {/* Conversation Transcript */}
        <div className="bg-[var(--bg-primary)] rounded-xl shadow-md p-8 transition-colors duration-200 print:shadow-none print:border">
          <div className="flex items-center gap-3 mb-6">
            <IconMessage size={24} className="text-[var(--accent)]" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] transition-colors duration-200">Conversation Transcript</h2>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {userMessages.length === 0 && assistantMessages.length === 0 && (
              <div className="text-center py-12">
                <IconMessage size={48} className="text-[var(--text-secondary)]/50 mx-auto mb-4" />
                <p className="text-[var(--text-secondary)] text-sm italic transition-colors duration-200">
                  No conversation data available. Start chatting to generate report content.
                </p>
              </div>
            )}
            
            {/* Interleave user and assistant messages */}
            {Array.from({ length: Math.max(userMessages.length, assistantMessages.length) }).map((_, index) => (
              <div key={index} className="space-y-4">
                {userMessages[index] && (
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-md">
                      <span className="text-white text-sm font-bold">U</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[var(--text-secondary)] transition-colors duration-200">User Query</span>
                        <span className="text-xs text-[var(--text-secondary)]/80">#{index + 1}</span>
                      </div>
                      <div className="bg-[color:rgba(47,143,107,0.08)] rounded-lg p-4 border-l-4 border-[var(--accent)] transition-colors duration-200">
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap transition-colors duration-200">{userMessages[index]}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {assistantMessages[index] && (
                  <div className="flex gap-3 items-start ml-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent)] flex items-center justify-center shadow-md">
                      <IconRobot size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[var(--text-secondary)] transition-colors duration-200">AI Response</span>
                        <span className="text-xs text-[var(--text-secondary)]/80">#{index + 1}</span>
                      </div>
                      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border-l-4 border-[var(--accent)] transition-colors duration-200">
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap transition-colors duration-200">{assistantMessages[index]}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[var(--bg-tertiary)] rounded-xl p-6 border-t-2 border-[var(--accent)] text-center transition-colors duration-200 print:border print:border-gray-300">
          <p className="text-sm text-[var(--text-secondary)] transition-colors duration-200">
            This report was automatically generated by <span className="font-bold text-[var(--accent)]">Crownwell AI Analyst</span>
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2 transition-colors duration-200">
            © {new Date().getFullYear()} Crownwell. All rights reserved.
          </p>
        </div>


      </div>
    </div>
  )
}
