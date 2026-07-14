import React, { useState } from 'react';
import { Plus, X, Edit2, Check, Download, ExternalLink, Trash2 } from 'lucide-react';
import { AppSettings } from '@/types';

interface ToolsPanelProps {
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export function ToolsPanel({ appSettings, onUpdateSettings }: ToolsPanelProps) {
  const [tools, setTools] = useState(appSettings.tools || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name.trim() || !url.trim()) return;

    let updatedTools;
    if (editingId) {
      updatedTools = tools.map(t =>
        t.id === editingId ? { ...t, name, url, description } : t
      );
    } else {
      updatedTools = [...tools, {
        id: crypto.randomUUID(),
        name,
        url,
        description
      }];
    }

    setTools(updatedTools);
    onUpdateSettings({ ...appSettings, tools: updatedTools });
    resetForm();
  };

  const handleDelete = (id: string) => {
    const updatedTools = tools.filter(t => t.id !== id);
    setTools(updatedTools);
    onUpdateSettings({ ...appSettings, tools: updatedTools });
  };

  const handleEdit = (tool: any) => {
    setEditingId(tool.id);
    setName(tool.name);
    setUrl(tool.url);
    setDescription(tool.description || '');
    setIsAdding(true);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setUrl('');
    setDescription('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Ferramentas e Scripts</h2>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre URLs de ferramentas, scripts e arquivos executáveis (.bat) para download ou acesso rápido.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Ferramenta
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 relative">
          <button
            onClick={resetForm}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <h3 className="text-lg font-bold text-slate-800 mb-6">
            {editingId ? 'Editar Ferramenta' : 'Nova Ferramenta'}
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Ferramenta</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gerenciador de Perfil"
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">URL / Link de Download</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Ex: /downloads/script.bat ou https://..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva para que serve esta ferramenta..."
                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-medium text-sm rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || !url.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4" />
                Salvar Ferramenta
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <div key={tool.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <Download className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(tool)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(tool.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <h3 className="text-base font-bold text-slate-800 mb-1">{tool.name}</h3>
            {tool.description && (
              <p className="text-sm text-slate-500 mb-4 line-clamp-3">{tool.description}</p>
            )}
            
            <div className="mt-auto pt-4">
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                <span>Baixar / Acessar</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
        
        {tools.length === 0 && !isAdding && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
            <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
              <Download className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-slate-700 font-bold mb-1">Nenhuma ferramenta cadastrada</h3>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
              Adicione links para scripts, programas ou documentações que a equipe de suporte utiliza com frequência.
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar Primeira Ferramenta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
