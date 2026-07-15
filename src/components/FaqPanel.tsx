import { useState } from 'react';
import { Plus, Trash2, Edit2, Copy, ChevronDown, ChevronRight, X, Check, Sparkles } from 'lucide-react';
import { AppSettings, FAQ, Ticket } from '@/types';
import { cn } from '@/lib/utils';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDateStr(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleString('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });
}

interface FaqPanelProps {
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  tickets?: Ticket[];
}

export function FaqPanel({ appSettings, onUpdateSettings, tickets = [] }: FaqPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [ticketViewMode, setTicketViewMode] = useState<'preview' | 'code'>('preview');
  const [copiedResult, setCopiedResult] = useState(false);
  
  const handleCopyResult = () => {
    if (viewingTicket?.structuredResult) {
      navigator.clipboard.writeText(viewingTicket.structuredResult);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2000);
    }
  };
  
  const [formData, setFormData] = useState<Omit<FAQ, 'id'>>({
    faqNumber: '',
    category: '',
    name: '',
    technicalInfo: '',
    type: '',
    service: '',
    subject: '',
    system: '',
    associatedProcedureId: '',
    associatedProcedureIds: [],
    procedure: '',
    originalLink: ''
  });

  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, { techInfo: boolean; procedure: boolean; tickets: boolean }>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [aiMatchedFaq, setAiMatchedFaq] = useState<FAQ | null>(null);
  const [aiSearchPerformed, setAiSearchPerformed] = useState(false);

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setIsSearchingAi(true);
    setAiSearchPerformed(true);
    setAiMatchedFaq(null);

    try {
      const response = await fetch('/api/search-faq-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: aiSearchQuery,
          faqs: appSettings.faqs || [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matchedFaqId) {
          const matched = (appSettings.faqs || []).find(f => f.id === data.matchedFaqId);
          setAiMatchedFaq(matched || null);
        } else {
          setAiMatchedFaq(null);
        }
      }
    } catch (error) {
      console.error('Error searching FAQ with AI:', error);
    } finally {
      setIsSearchingAi(false);
    }
  };

  const handleClearAiSearch = () => {
    setAiSearchQuery('');
    setAiMatchedFaq(null);
    setAiSearchPerformed(false);
  };

  const handleOpenForm = (faq?: FAQ) => {
    if (faq) {
      setEditingId(faq.id);
      setFormData({
        faqNumber: faq.faqNumber || '',
        category: faq.category || '',
        name: faq.name,
        technicalInfo: faq.technicalInfo,
        type: faq.type,
        service: faq.service,
        subject: faq.subject,
        system: faq.system,
        associatedProcedureId: faq.associatedProcedureId || '',
        associatedProcedureIds: faq.associatedProcedureIds || (faq.associatedProcedureId ? [faq.associatedProcedureId] : []),
        procedure: faq.procedure,
        originalLink: faq.originalLink || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        faqNumber: '',
        category: '',
        name: '',
        technicalInfo: '',
        type: '',
        service: '',
        subject: '',
        system: '',
        associatedProcedureId: '',
        associatedProcedureIds: [],
        procedure: '',
        originalLink: '',
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name) return;

    let newFaqs = appSettings.faqs || [];
    if (editingId) {
      newFaqs = newFaqs.map(f => f.id === editingId ? { ...formData, id: editingId } : f);
    } else {
      const newFaq: FAQ = { ...formData, id: Date.now().toString() };
      newFaqs = [...newFaqs, newFaq];
    }
    
    onUpdateSettings({ ...appSettings, faqs: newFaqs });
    handleCloseForm();
  };

  const handleDelete = (id: string) => {
    const newFaqs = (appSettings.faqs || []).filter(f => f.id !== id);
    onUpdateSettings({ ...appSettings, faqs: newFaqs });
  };

  const toggleExpand = (id: string, section: 'techInfo' | 'procedure' | 'tickets') => {
    setExpandedFaqs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [section]: !prev[id]?.[section]
      }
    }));
  };

  const renderFaqCard = (faq: FAQ, index: number, showCategoryBadge = false) => (
    <div key={faq.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded">#{index + 1}</span>
          <h4 className="font-bold text-slate-800 flex-1 flex items-center gap-2 flex-wrap">
            <span>FAQ#: {faq.faqNumber || faq.id} — {faq.name}</span>
            {showCategoryBadge && faq.category && (
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {faq.category}
              </span>
            )}
          </h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {faq.originalLink && (
            <a href={faq.originalLink} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-full border border-slate-200 transition-colors mr-2">
              Ver Original
            </a>
          )}
          <button onClick={() => handleOpenForm(faq)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={() => handleDelete(faq.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="p-4 text-sm text-slate-600 border-b border-slate-100 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><strong className="text-slate-700">Tipo:</strong> {faq.type || '—'}</div>
          <div><strong className="text-slate-700">Serviço:</strong> {faq.service || '—'}</div>
          <div><strong className="text-slate-700">Assunto:</strong> {faq.subject || '—'}</div>
          <div><strong className="text-slate-700">Sistema:</strong> {faq.system || '—'}</div>
        </div>

        {((faq.associatedProcedureIds && faq.associatedProcedureIds.length > 0) || faq.associatedProcedureId) && (
          <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Procedimentos Associados:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(() => {
                const ids = faq.associatedProcedureIds || (faq.associatedProcedureId ? [faq.associatedProcedureId] : []);
                return ids.map(id => {
                  const proc = procedures.find(p => p.id === id);
                  if (!proc) return null;
                  return (
                    <span key={id} className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                      {proc.name}
                    </span>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="p-2 space-y-2">
        <div>
          <button 
            onClick={() => toggleExpand(faq.id, 'techInfo')}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 p-2"
          >
            {expandedFaqs[faq.id]?.techInfo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Informação técnica
          </button>
          {expandedFaqs[faq.id]?.techInfo && (
            <div 
              className="mx-2 p-3 bg-slate-50 rounded text-sm text-slate-700 whitespace-pre-wrap quill-content"
              dangerouslySetInnerHTML={{ __html: faq.technicalInfo || '—' }}
            />
          )}
        </div>
        <div>
          <button 
            onClick={() => toggleExpand(faq.id, 'procedure')}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 p-2"
          >
            {expandedFaqs[faq.id]?.procedure ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Procedimento
          </button>
          {expandedFaqs[faq.id]?.procedure && (
            <div 
              className="mx-2 p-3 bg-slate-50 rounded text-sm text-slate-700 whitespace-pre-wrap quill-content"
              dangerouslySetInnerHTML={{ __html: faq.procedure || '—' }}
            />
          )}
        </div>
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <button 
          onClick={() => toggleExpand(faq.id, 'tickets')}
          className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
        >
          {expandedFaqs[faq.id]?.tickets ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Chamados associados ({tickets.filter(t => t.associatedFaqId === faq.id).length})
        </button>
        {expandedFaqs[faq.id]?.tickets && (
          <div className="mt-3 space-y-2">
            {tickets.filter(t => t.associatedFaqId === faq.id).length === 0 ? (
              <p className="text-sm text-slate-500 italic ml-5">Nenhum chamado associado.</p>
            ) : (
              <div className="ml-5 flex flex-col gap-2">
                {tickets.filter(t => t.associatedFaqId === faq.id).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setViewingTicket(t)}
                    className="text-left w-full text-sm border border-slate-200 rounded-xl p-3 bg-white hover:border-blue-400 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800">ID: {t.id}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                          {t.category || 'Sem Categoria'}
                        </span>
                        {t.isEscalated && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                            ESCALONADO
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 line-clamp-2 text-xs md:text-sm">{t.description}</p>
                    </div>
                    <div className="text-xs text-blue-600 font-bold group-hover:text-blue-800 flex items-center gap-1 shrink-0 self-end sm:self-center">
                      Visualizar chamado →
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const faqs = appSettings.faqs || [];
  const procedures = appSettings.procedures || [];

  const duplicateFaq = formData.faqNumber.trim() !== '' 
    ? faqs.find(f => f.faqNumber?.trim().toLowerCase() === formData.faqNumber.trim().toLowerCase() && f.id !== editingId)
    : undefined;

  const filteredFaqs = faqs.filter(faq => {
    const searchLower = searchTerm.toLowerCase();
    return (
      faq.name.toLowerCase().includes(searchLower) ||
      (faq.faqNumber && faq.faqNumber.toLowerCase().includes(searchLower)) ||
      (faq.category && faq.category.toLowerCase().includes(searchLower)) ||
      (faq.subject && faq.subject.toLowerCase().includes(searchLower)) ||
      (faq.technicalInfo && faq.technicalInfo.toLowerCase().includes(searchLower)) ||
      (faq.procedure && faq.procedure.toLowerCase().includes(searchLower))
    );
  });

  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    const cat = faq.category || 'Sem Categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategory(prev => prev === category ? null : category);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">FAQs Cadastradas</h2>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova FAQ
        </button>
      </div>

      {/* Busca com IA */}
      <div className="p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-white border border-blue-200 rounded-xl shadow-xs space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
          <h3 className="font-bold text-slate-800 text-sm md:text-base">Busca Inteligente por IA (Encontrar FAQ Ideal)</h3>
        </div>
        <p className="text-xs text-slate-500">
          Cole a demanda do chamado ou as palavras-chave para que o Gemini analise e encontre a FAQ exata para o atendimento.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: Cliente reclama que não consegue acessar a VPN, dá erro de credencial inválida..."
            value={aiSearchQuery}
            onChange={(e) => setAiSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            className="flex-1 p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          />
          <button
            onClick={handleAiSearch}
            disabled={isSearchingAi || !aiSearchQuery.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSearchingAi ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Buscar com IA</span>
              </>
            )}
          </button>
          {aiSearchPerformed && (
            <button
              onClick={handleClearAiSearch}
              className="p-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors"
              title="Limpar Busca"
            >
              <X className="h-4 w-4 shrink-0" />
            </button>
          )}
        </div>

        {/* Resultados da Busca por IA */}
        {aiSearchPerformed && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            {isSearchingAi ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2">
                <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium animate-pulse">A Inteligência Artificial está analisando as FAQs...</p>
              </div>
            ) : aiMatchedFaq ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
                    <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>FAQ Encontrada pela IA!</span>
                  </div>
                  {aiMatchedFaq.originalLink && (
                    <a
                      href={aiMatchedFaq.originalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs shrink-0"
                    >
                      Acessar Link Externo
                    </a>
                  )}
                </div>

                {/* Abaixo a FAQ aqui do App */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visualização da FAQ no App:</p>
                  {renderFaqCard(aiMatchedFaq, (appSettings.faqs || []).indexOf(aiMatchedFaq), true)}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-center text-sm text-amber-800">
                A IA não encontrou nenhuma FAQ diretamente correspondente à sua demanda na base de conhecimento atual.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar em todas as FAQs (nome, número, conteúdo, etc)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
            <p className="text-slate-500 font-medium">Nenhuma FAQ encontrada.</p>
          </div>
        ) : searchTerm.trim() !== '' ? (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
              Resultados da busca: {filteredFaqs.length} FAQ(s) encontrada(s) para "{searchTerm}"
            </div>
            {filteredFaqs.map((faq, index) => renderFaqCard(faq, index, true))}
          </div>
        ) : (
          Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
            <div key={category} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  {expandedCategory === category ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
                  {category} <span className="text-sm font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{categoryFaqs.length}</span>
                </h3>
              </button>

              {expandedCategory === category && (
                <div className="p-4 space-y-4 border-t border-slate-200">
                  {categoryFaqs.map((faq, index) => renderFaqCard(faq, index, false))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-start justify-center p-4 sm:p-8 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-4 sm:my-8 relative">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar FAQ' : 'Nova FAQ'}</h2>
              <button onClick={handleCloseForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Número da FAQ</label>
                  <input
                    type="text"
                    value={formData.faqNumber}
                    onChange={e => setFormData({ ...formData, faqNumber: e.target.value })}
                    className={cn(
                      "w-full p-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors",
                      duplicateFaq 
                        ? "border-red-300 focus:ring-red-500 bg-red-50/50" 
                        : "border-slate-200 focus:ring-blue-500"
                    )}
                    placeholder="Ex: 123"
                  />
                  {duplicateFaq && (
                    <div className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1 animate-fade-in">
                      <span>⚠️ Esta FAQ já existe: <strong className="underline">{duplicateFaq.name}</strong></span>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome da FAQ</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione a categoria</option>
                    {(appSettings.categories || []).map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Link da FAQ original</label>
                  <input
                    type="url"
                    value={formData.originalLink || ''}
                    onChange={e => setFormData({ ...formData, originalLink: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="quill-container">
                <label className="block text-sm font-bold text-slate-700 mb-2">Informação técnica</label>
                <ReactQuill
                  theme="snow"
                  value={formData.technicalInfo}
                  onChange={(value) => setFormData({ ...formData, technicalInfo: value })}
                  className="bg-white rounded-lg"
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    <option value="Incidente">Incidente</option>
                    <option value="Requisição de serviço">Requisição de serviço</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Serviço</label>
                  <input
                    type="text"
                    value={formData.service}
                    onChange={e => setFormData({ ...formData, service: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Assunto</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Sistema associado</label>
                  <input
                    type="text"
                    value={formData.system}
                    onChange={e => setFormData({ ...formData, system: e.target.value })}
                    placeholder="Digite o sistema..."
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Procedimentos associados <span className="text-slate-400 font-normal text-xs">(Selecione quantos desejar)</span>
                  </label>
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {procedures.length === 0 ? (
                      <p className="text-slate-400 text-xs italic p-1">Nenhum procedimento cadastrado.</p>
                    ) : (
                      procedures.map(p => {
                        const currentIds = formData.associatedProcedureIds || [];
                        const isChecked = currentIds.includes(p.id);
                        return (
                          <label 
                            key={p.id} 
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                              isChecked 
                                ? "bg-blue-50/60 border-blue-200 shadow-2xs" 
                                : "bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-350"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                let updatedIds: string[];
                                if (checked) {
                                  updatedIds = [...currentIds, p.id];
                                } else {
                                  updatedIds = currentIds.filter(id => id !== p.id);
                                }
                                setFormData({
                                  ...formData,
                                  associatedProcedureIds: updatedIds,
                                  associatedProcedureId: updatedIds[0] || ''
                                });
                              }}
                              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0"
                            />
                            <div className="text-xs min-w-0">
                              <span className="font-bold text-slate-700 block truncate" title={p.name}>{p.name}</span>
                              {p.description && (
                                <span className="text-slate-500 text-[10px] block truncate" title={p.description}>
                                  {p.description}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="quill-container">
                <label className="block text-sm font-bold text-slate-700 mb-2">Procedimento</label>
                <ReactQuill
                  theme="snow"
                  value={formData.procedure}
                  onChange={(value) => setFormData({ ...formData, procedure: value })}
                  className="bg-white rounded-lg"
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl sticky bottom-0 z-10">
              <button
                onClick={handleCloseForm}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !!duplicateFaq}
                className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-slate-800">Chamado {viewingTicket.id}</h2>
                  {viewingTicket.isEscalated && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold">
                      ESCALONADO
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  Criado em {formatDateStr(viewingTicket.createdAt)}
                  {viewingTicket.finishedAt && ` • Finalizado em ${formatDateStr(viewingTicket.finishedAt)}`}
                </p>
              </div>
              <button 
                onClick={() => setViewingTicket(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duração</span>
                  <span className="text-sm font-bold text-slate-800">{formatDuration(viewingTicket.durationSeconds)}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoria</span>
                  <span className="text-sm font-bold text-slate-800">{viewingTicket.category || '-'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Login/Ramal</span>
                  <span className="text-sm font-bold text-slate-800">{viewingTicket.networkLogin || '-'} / {viewingTicket.extension || '-'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Celular</span>
                  <span className="text-sm font-bold text-slate-800">{viewingTicket.mobile || '-'}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Endereços Lógicos</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Micro</span>
                    <span className="text-sm font-medium text-slate-700">{viewingTicket.microLogicalAddress || '-'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Impressora</span>
                    <span className="text-sm font-medium text-slate-700">{viewingTicket.printerLogicalAddress || '-'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Monitor</span>
                    <span className="text-sm font-medium text-slate-700">{viewingTicket.monitorLogicalAddress || '-'}</span>
                  </div>
                </div>
              </div>

               {viewingTicket.structuredResult && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        Texto Estruturado (IA)
                      </h3>
                      <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          onClick={() => setTicketViewMode('preview')}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                            ticketViewMode === 'preview'
                              ? "bg-white text-slate-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          Visualização Formatada
                        </button>
                        <button
                          onClick={() => setTicketViewMode('code')}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                            ticketViewMode === 'code'
                              ? "bg-white text-slate-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          Código HTML (Bruto)
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleCopyResult}
                      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors bg-white border border-slate-200 px-2.5 py-1 rounded-md cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      {copiedResult ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedResult ? <span className="text-emerald-500">Copiado!</span> : <span>Copiar HTML</span>}
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    {ticketViewMode === 'preview' ? (
                      <div 
                        className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed bg-white rounded-lg border border-slate-100 p-4 shadow-xs"
                        dangerouslySetInnerHTML={{ __html: viewingTicket.structuredResult }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed bg-white rounded-lg border border-slate-100 p-4 shadow-xs">
                        {viewingTicket.structuredResult}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Descrição Original</h3>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                    {viewingTicket.description || <span className="italic text-slate-400">Nenhuma descrição original registrada.</span>}
                  </pre>
                </div>
              </div>
              
              <div className="pt-6 flex justify-end">
                <button 
                  onClick={() => setViewingTicket(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
