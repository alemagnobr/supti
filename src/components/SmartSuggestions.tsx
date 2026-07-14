import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  FileText, 
  BookOpen, 
  Info, 
  History, 
  Check, 
  Plus, 
  Copy, 
  X,
  Eye,
  ArrowRight,
  Search,
  Pin
} from 'lucide-react';
import { FAQ, Procedure, Orientation, Information, Ticket, ActiveTicket, AppSettings } from '@/types';
import { cn } from '@/lib/utils';

interface SmartSuggestionsProps {
  description: string;
  appSettings: AppSettings;
  finishedTickets: Ticket[];
  ticket: ActiveTicket;
  onUpdate: (ticket: ActiveTicket) => void;
}

// Common Portuguese stopwords to ignore during keyword splitting
const STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'com', 'sem', 'por', 'pelo', 'pela', 'pelos', 'pelas',
  'que', 'se', 'ao', 'aos', 'ou', 'e', 'mas', 'como', 'mais',
  'foi', 'foram', 'ser', 'ter', 'esta', 'este', 'isso', 'isto',
  'nao', 'não', 'esta', 'está', 'ele', 'ela', 'eles', 'elas',
  'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes', 'meu', 'minha',
  'meus', 'minhas', 'seu', 'sua', 'seus', 'suas', 'teu', 'tua',
  'sobre', 'entre', 'até', 'ate', 'num', 'numa', 'você', 'voce',
  'ele', 'ela', 'outra', 'outro', 'outros', 'outras', 'esta', 'está'
]);

interface SuggestionItem {
  id: string;
  type: 'faq' | 'procedure' | 'orientation' | 'information' | 'ticket';
  title: string;
  subtitle: string;
  content: string;
  extraContent?: string;
  score: number;
  original: any;
}

type TabType = 'all' | 'faqs' | 'procedures' | 'orientations' | 'informations' | 'tickets';

export function SmartSuggestions({ description, appSettings, finishedTickets, ticket, onUpdate }: SmartSuggestionsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [previewItem, setPreviewItem] = useState<SuggestionItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('@helpdesk:pinnedSuggestions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const cleanDescription = description.trim().toLowerCase();

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds(prev => {
      const updated = prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id];
      localStorage.setItem('@helpdesk:pinnedSuggestions', JSON.stringify(updated));
      return updated;
    });
  };

  // Smart suggestions logic
  const suggestions = useMemo(() => {
    const searchTarget = searchQuery.trim().toLowerCase();
    const isManualSearch = searchTarget.length >= 2;
    const isDescriptionSearch = !isManualSearch && cleanDescription.length >= 3;
    const showPinnedOnly = !isManualSearch && !isDescriptionSearch;

    const activeQuery = isManualSearch ? searchTarget : cleanDescription;
    const words = activeQuery.split(/[\s,.\-()]+/);
    const keywords = words.filter(w => w.length >= 3 && !STOPWORDS.has(w));

    if (keywords.length === 0 && words.length > 0) {
      keywords.push(...words.filter(w => w.length >= 2));
    }

    const list: SuggestionItem[] = [];

    // 1. Process FAQs
    if (appSettings.faqs) {
      appSettings.faqs.forEach(faq => {
        const id = `faq-${faq.id}`;
        const isPinned = pinnedIds.includes(id);

        if (showPinnedOnly) {
          if (isPinned) {
            list.push({
              id,
              type: 'faq',
              title: faq.faqNumber ? `FAQ# ${faq.faqNumber} — ${faq.name}` : faq.name,
              subtitle: faq.category ? `FAQ • ${faq.category}` : 'FAQ',
              content: faq.technicalInfo || faq.procedure || '',
              extraContent: faq.procedure,
              score: 1,
              original: faq
            });
          }
          return;
        }

        let score = 0;
        const faqNumClean = (faq.faqNumber || '').toLowerCase();
        const nameClean = (faq.name || '').toLowerCase();
        const techClean = (faq.technicalInfo || '').toLowerCase();
        const procClean = (faq.procedure || '').toLowerCase();
        const subjectClean = (faq.subject || '').toLowerCase();
        const sysClean = (faq.system || '').toLowerCase();

        // High priority exact match
        if (nameClean.includes(activeQuery)) score += 180;
        if (faqNumClean && activeQuery.includes(faqNumClean)) score += 200;

        // Keyword scoring
        keywords.forEach(kw => {
          if (nameClean.includes(kw)) score += 40;
          if (faqNumClean && faqNumClean.includes(kw)) score += 50;
          if (techClean.includes(kw)) score += 15;
          if (procClean.includes(kw)) score += 15;
          if (subjectClean.includes(kw)) score += 20;
          if (sysClean.includes(kw)) score += 20;
        });

        if (score > 0) {
          list.push({
            id,
            type: 'faq',
            title: faq.faqNumber ? `FAQ# ${faq.faqNumber} — ${faq.name}` : faq.name,
            subtitle: faq.category ? `FAQ • ${faq.category}` : 'FAQ',
            content: faq.technicalInfo || faq.procedure || '',
            extraContent: faq.procedure,
            score,
            original: faq
          });
        }
      });
    }

    // 2. Process Procedures
    if (appSettings.procedures) {
      appSettings.procedures.forEach(proc => {
        const id = `proc-${proc.id}`;
        const isPinned = pinnedIds.includes(id);

        if (showPinnedOnly) {
          if (isPinned) {
            list.push({
              id,
              type: 'procedure',
              title: `Procedimento: ${proc.name}`,
              subtitle: proc.category ? `Procedimento • ${proc.category}` : 'Procedimento',
              content: proc.description,
              extraContent: proc.steps,
              score: 1,
              original: proc
            });
          }
          return;
        }

        let score = 0;
        const nameClean = (proc.name || '').toLowerCase();
        const descClean = (proc.description || '').toLowerCase();
        const stepsClean = (proc.steps || '').toLowerCase();

        if (nameClean.includes(activeQuery)) score += 150;

        keywords.forEach(kw => {
          if (nameClean.includes(kw)) score += 40;
          if (descClean.includes(kw)) score += 10;
          if (stepsClean.includes(kw)) score += 10;
        });

        if (score > 0) {
          list.push({
            id,
            type: 'procedure',
            title: `Procedimento: ${proc.name}`,
            subtitle: proc.category ? `Procedimento • ${proc.category}` : 'Procedimento',
            content: proc.description,
            extraContent: proc.steps,
            score,
            original: proc
          });
        }
      });
    }

    // 3. Process Orientations
    if (appSettings.orientations) {
      appSettings.orientations.forEach(ori => {
        const id = `ori-${ori.id}`;
        const isPinned = pinnedIds.includes(id);

        if (showPinnedOnly) {
          if (isPinned) {
            list.push({
              id,
              type: 'orientation',
              title: `Orientação: ${ori.name}`,
              subtitle: ori.category ? `Orientação • ${ori.category}` : 'Orientação',
              content: ori.description,
              extraContent: ori.steps,
              score: 1,
              original: ori
            });
          }
          return;
        }

        let score = 0;
        const nameClean = (ori.name || '').toLowerCase();
        const descClean = (ori.description || '').toLowerCase();
        const stepsClean = (ori.steps || '').toLowerCase();

        if (nameClean.includes(activeQuery)) score += 150;

        keywords.forEach(kw => {
          if (nameClean.includes(kw)) score += 40;
          if (descClean.includes(kw)) score += 10;
          if (stepsClean.includes(kw)) score += 10;
        });

        if (score > 0) {
          list.push({
            id,
            type: 'orientation',
            title: `Orientação: ${ori.name}`,
            subtitle: ori.category ? `Orientação • ${ori.category}` : 'Orientação',
            content: ori.description,
            extraContent: ori.steps,
            score,
            original: ori
          });
        }
      });
    }

    // 4. Process Informations (Technical Doubts / Info)
    if (appSettings.informations) {
      appSettings.informations.forEach(info => {
        const id = `info-${info.id}`;
        const isPinned = pinnedIds.includes(id);

        if (showPinnedOnly) {
          if (isPinned) {
            list.push({
              id,
              type: 'information',
              title: info.title,
              subtitle: 'Dúvida Técnica / Informações',
              content: info.content,
              score: 1,
              original: info
            });
          }
          return;
        }

        let score = 0;
        const titleClean = (info.title || '').toLowerCase();
        const contentClean = (info.content || '').toLowerCase();

        if (titleClean.includes(activeQuery)) score += 150;

        keywords.forEach(kw => {
          if (titleClean.includes(kw)) score += 45;
          if (contentClean.includes(kw)) score += 12;
        });

        if (score > 0) {
          list.push({
            id,
            type: 'information',
            title: info.title,
            subtitle: 'Dúvida Técnica / Informações',
            content: info.content,
            score,
            original: info
          });
        }
      });
    }

    // 5. Process Finished Tickets
    if (finishedTickets) {
      finishedTickets.forEach(t => {
        const id = `ticket-${t.id}`;
        const isPinned = pinnedIds.includes(id);

        if (showPinnedOnly) {
          if (isPinned) {
            list.push({
              id,
              type: 'ticket',
              title: t.category || `Chamado #${t.id}`,
              subtitle: t.category ? `Histórico • #${t.id}` : 'Histórico',
              content: t.description,
              extraContent: t.structuredResult || undefined,
              score: 1,
              original: t
            });
          }
          return;
        }

        let score = 0;
        const idClean = String(t.id).toLowerCase();
        const descClean = (t.description || '').toLowerCase();
        const resClean = (t.structuredResult || '').toLowerCase();
        const catClean = (t.category || '').toLowerCase();

        if (idClean === activeQuery) score += 300;
        if (descClean.includes(activeQuery)) score += 100;

        keywords.forEach(kw => {
          if (descClean.includes(kw)) score += 25;
          if (resClean.includes(kw)) score += 15;
          if (catClean.includes(kw)) score += 10;
        });

        if (score > 0) {
          list.push({
            id,
            type: 'ticket',
            title: t.category || `Chamado #${t.id}`,
            subtitle: t.category ? `Histórico • #${t.id}` : 'Histórico',
            content: t.description,
            extraContent: t.structuredResult || undefined,
            score,
            original: t
          });
        }
      });
    }

    // Sort pinned items first, then by score (descending)
    return list.sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return b.score - a.score;
    });
  }, [cleanDescription, searchQuery, appSettings, finishedTickets, pinnedIds]);

  // Filter suggestions based on active tab
  const filteredSuggestions = useMemo(() => {
    if (activeTab === 'all') return suggestions;
    if (activeTab === 'faqs') return suggestions.filter(s => s.type === 'faq');
    if (activeTab === 'procedures') return suggestions.filter(s => s.type === 'procedure');
    if (activeTab === 'orientations') return suggestions.filter(s => s.type === 'orientation');
    if (activeTab === 'informations') return suggestions.filter(s => s.type === 'information');
    if (activeTab === 'tickets') return suggestions.filter(s => s.type === 'ticket');
    return suggestions;
  }, [suggestions, activeTab]);

  const handleCopyText = (content: string, id: string) => {
    const cleanText = content.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAssociateFaq = (faqId: string) => {
    const selectedFaq = appSettings.faqs?.find(f => f.id === faqId);
    if (selectedFaq) {
      const faqProcIds = selectedFaq.associatedProcedureIds || (selectedFaq.associatedProcedureId ? [selectedFaq.associatedProcedureId] : []);
      const currentProcs = ticket.selectedProcedures || [];
      const mergedProcs = Array.from(new Set([...currentProcs, ...faqProcIds]));
      onUpdate({
        ...ticket,
        associatedFaqId: faqId,
        selectedProcedures: mergedProcs
      });
    } else {
      onUpdate({ ...ticket, associatedFaqId: faqId });
    }
  };

  const handleToggleProcedure = (procId: string) => {
    const current = ticket.selectedProcedures || [];
    const updated = current.includes(procId)
      ? current.filter(id => id !== procId)
      : [...current, procId];
    onUpdate({ ...ticket, selectedProcedures: updated });
  };

  const handleAppendToDescription = (textToAppend: string) => {
    const cleanText = textToAppend.replace(/<[^>]*>/g, '\n').replace(/\n\s*\n/g, '\n').trim();
    const currentDesc = ticket.description.trim();
    const newDesc = currentDesc 
      ? `${currentDesc}\n\n[Referência]: ${cleanText}`
      : cleanText;
    onUpdate({ ...ticket, description: newDesc });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col h-[270px] relative">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          {searchQuery.trim().length >= 2 ? (
            <div className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Busca Manual ({suggestions.length})
              </span>
            </div>
          ) : cleanDescription.length >= 3 ? (
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Recomendações ({suggestions.length})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Fixados ({suggestions.length})
              </span>
            </div>
          )}
        </div>
        <span className={cn(
          "text-[9px] px-1.5 py-0.2 font-bold rounded-full uppercase",
          searchQuery.trim().length >= 2
            ? "text-blue-600 bg-blue-50"
            : cleanDescription.length >= 3
              ? "text-emerald-600 bg-emerald-50"
              : "text-amber-600 bg-amber-50"
        )}>
          {searchQuery.trim().length >= 2 ? 'Busca' : cleanDescription.length >= 3 ? 'Live' : 'Fixos'}
        </span>
      </div>

      {/* Manual Search Bar */}
      <div className="relative mb-2 shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar FAQs, procedimentos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg pl-7.5 pr-7 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Tabs - horizontal scrolling with ultra-thin styled scrollbar */}
      <div className="flex gap-1 overflow-x-auto pb-2 shrink-0 scrollbar-thin [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
        {(['all', 'faqs', 'procedures', 'orientations', 'informations', 'tickets'] as TabType[]).map((tab) => {
          const count = tab === 'all' 
            ? suggestions.length 
            : suggestions.filter(s => {
                if (tab === 'faqs') return s.type === 'faq';
                if (tab === 'procedures') return s.type === 'procedure';
                if (tab === 'orientations') return s.type === 'orientation';
                if (tab === 'informations') return s.type === 'information';
                if (tab === 'tickets') return s.type === 'ticket';
                return false;
              }).length;

          const label = {
            all: 'Tudo',
            faqs: 'FAQs',
            procedures: 'Proceds',
            orientations: 'Orients',
            informations: 'Infos',
            tickets: 'Histórico'
          }[tab];

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer",
                activeTab === tab
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-800 border border-slate-200"
              )}
            >
              {label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Suggestion List - super dense and clean */}
      <div className="flex-1 overflow-y-auto mt-1 space-y-1.5 pr-0.5 min-h-0 scrollbar-thin">
        {filteredSuggestions.length === 0 ? (
          searchQuery.trim().length >= 2 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 min-h-0">
              <Search className="h-5 w-5 text-slate-300 mb-1" />
              <h5 className="text-[10px] font-bold text-slate-600 mb-0.5">Nenhum resultado</h5>
              <p className="text-[9px] text-slate-400 max-w-[180px] leading-normal">
                Não encontramos correspondências para sua busca.
              </p>
            </div>
          ) : cleanDescription.length >= 3 ? (
            <div className="text-center py-8 text-slate-400 text-[11px] italic">
              Nenhuma recomendação automática disponível.
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 min-h-0">
              <Sparkles className="h-5 w-5 text-blue-400 mb-1 animate-pulse" />
              <h5 className="text-[10px] font-bold text-slate-700 mb-0.5">Assistente em Tempo Real</h5>
              <p className="text-[9px] text-slate-400 max-w-[200px] leading-relaxed">
                Digite a descrição do chamado para sugestões instantâneas, busque acima ou fixe seus itens favoritos.
              </p>
            </div>
          )
        ) : (
          filteredSuggestions.map((item) => {
            const isAssociatedFaq = item.type === 'faq' && ticket.associatedFaqId === item.original.id;
            const isSelectedProc = item.type === 'procedure' && (ticket.selectedProcedures || []).includes(item.original.id);
            const isPinned = pinnedIds.includes(item.id);

            // Icon select
            const Icon = {
              faq: HelpCircle,
              procedure: FileText,
              orientation: BookOpen,
              information: Info,
              ticket: History
            }[item.type];

            // Colors per type
            const colors = {
              faq: 'border-purple-200 bg-purple-50 text-purple-700',
              procedure: 'border-blue-200 bg-blue-50 text-blue-700',
              orientation: 'border-amber-200 bg-amber-50 text-amber-700',
              information: 'border-cyan-200 bg-cyan-50 text-cyan-700',
              ticket: 'border-slate-200 bg-slate-50 text-slate-700'
            }[item.type];

            return (
              <div 
                key={item.id} 
                onClick={() => setPreviewItem(item)}
                className={cn(
                  "border rounded-lg p-2 bg-white hover:bg-slate-50 cursor-pointer transition-all flex items-start justify-between gap-1.5 group/item hover:border-slate-300",
                  isPinned ? "border-amber-200 bg-amber-50/20" : "border-slate-200"
                )}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className={cn("p-1 rounded-md shrink-0 border mt-0.5", colors)}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        {item.subtitle.split(' • ')[0]}
                      </span>
                      {(isAssociatedFaq || isSelectedProc) && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1 rounded-full uppercase shrink-0">
                          Selecionado
                        </span>
                      )}
                      {isPinned && (
                        <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-1 rounded-full uppercase shrink-0">
                          Fixo
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-[11px] text-slate-800 line-clamp-1 leading-snug group-hover/item:text-blue-600 transition-colors">
                      {item.title}
                    </h5>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0 self-center">
                  <button 
                    type="button" 
                    onClick={(e) => handleTogglePin(item.id, e)}
                    className={cn(
                      "p-1 rounded-md transition-all cursor-pointer",
                      isPinned
                        ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                        : "text-slate-300 hover:text-amber-500 hover:bg-slate-100 md:opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity duration-150"
                    )}
                    title={isPinned ? "Desafixar" : "Fixar no topo"}
                  >
                    <Pin className={cn("h-3 w-3", isPinned && "fill-amber-500")} />
                  </button>
                  <button 
                    type="button" 
                    className="text-slate-300 group-hover/item:text-blue-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Visualizar"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* GORGEOUS SCREEN-OVERLAY DETAILS MODAL */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex items-start gap-3 min-w-0">
                <span className={cn(
                  "p-2.5 rounded-xl shrink-0 border mt-0.5",
                  {
                    faq: 'border-purple-200 bg-purple-50 text-purple-700',
                    procedure: 'border-blue-200 bg-blue-50 text-blue-700',
                    orientation: 'border-amber-200 bg-amber-50 text-amber-700',
                    information: 'border-cyan-200 bg-cyan-50 text-cyan-700',
                    ticket: 'border-slate-200 bg-slate-50 text-slate-700'
                  }[previewItem.type]
                )}>
                  {{
                    faq: <HelpCircle className="h-5 w-5" />,
                    procedure: <FileText className="h-5 w-5" />,
                    orientation: <BookOpen className="h-5 w-5" />,
                    information: <Info className="h-5 w-5" />,
                    ticket: <History className="h-5 w-5" />
                  }[previewItem.type]}
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {previewItem.subtitle}
                  </span>
                  <h4 className="font-bold text-base text-slate-900 mt-0.5 leading-snug">
                    {previewItem.title}
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-4">
                <button
                  type="button"
                  onClick={(e) => handleTogglePin(previewItem.id, e)}
                  className={cn(
                    "p-2 rounded-lg border transition-all cursor-pointer",
                    pinnedIds.includes(previewItem.id)
                      ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                      : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                  title={pinnedIds.includes(previewItem.id) ? "Desafixar" : "Fixar no topo"}
                >
                  <Pin className={cn("h-4 w-4", pinnedIds.includes(previewItem.id) && "fill-amber-500 text-amber-500")} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Spacious & Beautiful */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 min-h-[150px]">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  {previewItem.type === 'ticket' ? 'Relato do Chamado' : 'Conteúdo / Solução Técnica'}
                </h5>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {previewItem.content.includes('<') && previewItem.content.includes('>') ? (
                    <div dangerouslySetInnerHTML={{ __html: previewItem.content }} className="quill-content text-slate-800" />
                  ) : (
                    previewItem.content
                  )}
                </div>
              </div>

              {previewItem.extraContent && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    {previewItem.type === 'ticket' ? 'Solução Estruturada' : 'Passos & Orientações Adicionais'}
                  </h5>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {previewItem.extraContent.includes('<') && previewItem.extraContent.includes('>') ? (
                      <div dangerouslySetInnerHTML={{ __html: previewItem.extraContent }} className="quill-content text-slate-800" />
                    ) : (
                      previewItem.extraContent
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {/* FAQ Specific Actions */}
                {previewItem.type === 'faq' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAssociateFaq(previewItem.original.id);
                      setPreviewItem(null);
                    }}
                    className={cn(
                      "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider cursor-pointer shadow-xs transition-all",
                      ticket.associatedFaqId === previewItem.original.id
                        ? "bg-purple-100 text-purple-800 border border-purple-300"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    )}
                  >
                    {ticket.associatedFaqId === previewItem.original.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {ticket.associatedFaqId === previewItem.original.id ? 'FAQ Associada' : 'Associar esta FAQ'}
                  </button>
                )}

                {/* Procedure Specific Actions */}
                {previewItem.type === 'procedure' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleProcedure(previewItem.original.id);
                    }}
                    className={cn(
                      "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider cursor-pointer shadow-xs transition-all",
                      (ticket.selectedProcedures || []).includes(previewItem.original.id)
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    {(ticket.selectedProcedures || []).includes(previewItem.original.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {(ticket.selectedProcedures || []).includes(previewItem.original.id) ? 'Procedimento Selecionado' : 'Selecionar Procedimento'}
                  </button>
                )}

                {/* Merge to ticket description */}
                <button
                  type="button"
                  onClick={() => {
                    handleAppendToDescription(previewItem.content);
                  }}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg uppercase tracking-wider cursor-pointer shadow-xs transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Mesclar no Chamado
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Copy content button */}
                <button
                  type="button"
                  onClick={() => handleCopyText(previewItem.content, previewItem.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold transition-all"
                >
                  {copiedId === previewItem.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copiedId === previewItem.id ? 'Copiado!' : 'Copiar Texto'}
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
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

