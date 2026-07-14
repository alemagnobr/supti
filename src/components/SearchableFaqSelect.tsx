import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, ChevronDown, X } from 'lucide-react';
import { FAQ } from '@/types';
import { cn } from '@/lib/utils';

interface SearchableFaqSelectProps {
  value: string;
  onChange: (value: string) => void;
  faqs: FAQ[];
  variant?: 'badge' | 'underlined';
}

export function SearchableFaqSelect({ value, onChange, faqs = [], variant = 'badge' }: SearchableFaqSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedFaq = useMemo(() => {
    return faqs.find(f => f.id === value);
  }, [faqs, value]);

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return faqs;
    const lowerSearch = search.toLowerCase();
    return faqs.filter(faq => 
      (faq.faqNumber || '').toLowerCase().includes(lowerSearch) ||
      (faq.name || '').toLowerCase().includes(lowerSearch) ||
      (faq.category || '').toLowerCase().includes(lowerSearch) ||
      (faq.system || '').toLowerCase().includes(lowerSearch) ||
      (faq.subject || '').toLowerCase().includes(lowerSearch)
    );
  }, [faqs, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input on open
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (faqId: string) => {
    onChange(faqId);
    setIsOpen(false);
    setSearch('');
  };

  const triggerClasses = variant === 'badge'
    ? "inline-flex items-center gap-1 max-w-[150px] truncate px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold outline-none cursor-pointer hover:bg-purple-100 transition-colors text-left"
    : "inline-flex items-center justify-between gap-2 text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer border-b border-slate-200 hover:border-slate-400 truncate w-full py-0.5 text-left";

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={triggerClasses}
        title={selectedFaq?.name || 'Sem FAQ'}
      >
        <span className="truncate flex-1">
          {selectedFaq ? `${selectedFaq.faqNumber} - ${selectedFaq.name}` : 'Sem FAQ'}
        </span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 opacity-60 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute z-[9999] mt-1 w-[320px] bg-white rounded-xl shadow-xl border border-slate-200 py-2 text-left left-0 sm:left-auto sm:right-0 animate-fade-in"
        >
          {/* Search Header */}
          <div className="px-3 pb-2 pt-1 border-b border-slate-100 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar FAQ por número, nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 focus:ring-0 p-0"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* List of FAQs */}
          <div className="max-h-[240px] overflow-y-auto py-1 divide-y divide-slate-50">
            {/* 'Sem FAQ' Option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={cn(
                "w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors hover:bg-slate-50",
                !value ? "text-purple-700 bg-purple-50/50 font-bold" : "text-slate-600"
              )}
            >
              <span>Sem FAQ</span>
              {!value && <Check className="h-3 w-3 text-purple-600" />}
            </button>

            {filteredFaqs.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-400 italic text-center">
                Nenhuma FAQ encontrada
              </div>
            ) : (
              filteredFaqs.map(faq => (
                <button
                  key={faq.id}
                  type="button"
                  onClick={() => handleSelect(faq.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 transition-colors hover:bg-slate-50",
                    value === faq.id ? "bg-purple-50/50 text-purple-900 font-bold" : "text-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      #{faq.faqNumber || '—'}
                    </span>
                    {value === faq.id && <Check className="h-3 w-3 text-purple-600 shrink-0" />}
                  </div>
                  <span className="line-clamp-2 text-slate-600 leading-normal">
                    {faq.name}
                  </span>
                  {faq.category && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 mt-0.5 self-start uppercase font-bold tracking-wider">
                      {faq.category}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
