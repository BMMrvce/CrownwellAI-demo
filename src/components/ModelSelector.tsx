import type { SupportedModel } from '../App'

interface ModelSelectorProps {
  selectedModel: SupportedModel
  onModelChange: (model: SupportedModel) => void
}

const MODELS: { value: SupportedModel; label: string; description: string }[] = [
  { value: 'gpt-5.1', label: 'Thinking', description: 'Most capable model' },
  { value: 'gpt-5-mini', label: 'Moderate', description: 'Balanced performance' },
  { value: 'gpt-5.1-nano', label: 'Fast', description: 'Fast and efficient' },
]

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  return (
    <div className="relative inline-flex items-center gap-2">
      <select
        id="model-select"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as SupportedModel)}
        className="appearance-none py-2 pr-10 pl-4 rounded-lg border border-emerald-500/30 bg-transparent text-slate-100 text-[0.95rem] font-medium cursor-pointer transition-all duration-200 hover:bg-emerald-500/5 focus:outline-none focus:border-emerald-500/60"
      >
        {MODELS.map((model) => (
          <option key={model.value} value={model.value}>
            {model.label}
          </option>
        ))}
      </select>
      <span className="absolute right-3 pointer-events-none text-slate-400 text-[0.6rem]">▼</span>
    </div>
  )
}

