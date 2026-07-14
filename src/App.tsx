import { useState, MouseEvent, useEffect, useRef } from 'react';
import { Plus, Layout, LogOut, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { TicketList } from '@/components/TicketList';
import { TicketForm } from '@/components/TicketForm';
import { SettingsPanel } from '@/components/SettingsPanel';
import { FaqPanel } from '@/components/FaqPanel';
import { ProcedurePanel } from '@/components/ProcedurePanel';
import { InformationPanel } from '@/components/InformationPanel';
import { ToolsPanel } from '@/components/ToolsPanel';
import { SLADashboard } from '@/components/SLADashboard';
import { Ticket, ActiveTicket, AppSettings } from '@/types';
import { cn } from '@/lib/utils';

// Firebase imports
import { auth, db, collection, doc, setDoc, getDocs, onSnapshot, signOut, handleFirestoreError, OperationType } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LoginScreen } from '@/components/LoginScreen';

const MOCK_TICKETS: Ticket[] = [];

const getModelFriendlyName = (modelId?: string) => {
  switch (modelId) {
    case 'deepseek/deepseek-r1:free': return 'DeepSeek R1';
    case 'meta-llama/llama-3.3-70b-instruct:free': return 'Llama 3.3 70B';
    case 'meta-llama/llama-3.1-8b-instruct:free': return 'Llama 3.1 8B';
    case 'qwen/qwen-2.5-72b-instruct:free': return 'Qwen 2.5 72B';
    case 'microsoft/phi-3-medium-128k-instruct:free': return 'Phi-3 Med';
    case 'google/gemini-2.5-flash:free':
    default:
      return 'Gemini Grátis';
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(true);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTabs, setActiveTabs] = useState<ActiveTicket[]>(() => {
    try {
      const saved = localStorage.getItem('@helpdesk:activeTabs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  
  const [currentTabId, setCurrentTabId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('@helpdesk:currentTabId');
      if (saved) return saved;
    } catch (e) {}
    return 'dashboard';
  });

  const defaultClosingText = `Para melhorarmos continuamente nossos serviços, foi enviado ao seu e-mail institucional um link para realizar a pesquisa de satisfação. Sua opinião é muito importante para aprimorarmos nosso atendimento e torná-lo ainda mais eficiente.

Agradecemos sua participação!

Atenciosamente,
Analista de Suporte.
Central de Atendimento.`;

  const defaultCategories = ['Impressora', 'Office', 'Sistema', 'Rede', 'Hardware', 'Outros'];
  
  const defaultProcedures: any[] = [];

  const defaultAiPromptStandard = `Você é um assistente técnico de TI. 
Eu vou te enviar um texto relatando um problema ou atendimento de suporte.
Sua tarefa é reestruturar esse texto em dois tópicos: "Demanda" e "Tratativa/Solução".
Corrija erros ortográficos e use linguagem profissional e técnica.
NÃO invente procedimentos ou informações que não estão no texto original nem na lista de procedimentos executados.
NÃO "encha linguiça" ou adicione detalhes não mencionados.{proceduresContext}{validationContext}{guidelinesContext}

O texto é:
"{description}"

Formate a saída EXATAMENTE assim:
Demanda: [texto da demanda]

Tratativa/Solução: [texto da tratativa/solução]`;

  const defaultAiPromptEscalated = `Você é um assistente técnico de TI. 
Eu vou te enviar um texto relatando um problema ou atendimento de suporte que está sendo ESCALONADO para outro setor.
Sua tarefa é reescrever esse texto relatando a descrição (demanda) e a tratativa em UMA ÚNICA FRASE CONTÍNUA (sem tópicos).
Corrija erros ortográficos e use linguagem profissional e técnica.{proceduresContext}
A sua resposta DEVE terminar OBRIGATORIAMENTE com a seguinte frase exata: "Cliente solicita suporte especializado para andamento do chamado."
NÃO use tópicos como "Demanda:" ou "Tratativa/Solução:". A resposta inteira deve ser um parágrafo/frase único.{guidelinesContext}

O texto é:
"{description}"`;

  const [appSettings, setAppSettings] = useState<AppSettings>({
    profileManagerPath: 'D:\\Users\\02826800124\\Documents\\Gerenciador de Perfil.bat',
    sla: { otima: 5, boa: 9, atencao: 15, ruim: 20, critica: 30 },
    closingTextEnabled: true,
    closingText: defaultClosingText,
    categories: defaultCategories,
    procedures: defaultProcedures,
    orientations: [],
    predefinedSolutions: [],
    aiGuidelines: [],
    aiPromptStandard: defaultAiPromptStandard,
    aiPromptEscalated: defaultAiPromptEscalated,
    aiProvider: 'gemini'
  });

  const [activeSidebarItem, setActiveSidebarItem] = useState('Atendimento');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Firestore Data
  useEffect(() => {
    if (!user) return;
    
    setDbLoading(true);
    
    // Listen to Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setAppSettings(prev => ({
          ...prev,
          ...data,
          profileManagerPath: data.profileManagerPath ?? prev.profileManagerPath,
        }));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/global'));

    // Listen to Tickets
    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
      const loadedTickets: Ticket[] = [];
      snapshot.forEach((doc) => {
        loadedTickets.push(doc.data() as Ticket);
      });
      setTickets(loadedTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setDbLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tickets'));

    return () => {
      unsubSettings();
      unsubTickets();
    };
  }, [user]);

  // Save Settings to Firestore when updated
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    if (!user) return;
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    }
  };

  // Keep a ref of active tabs for the interval
  const activeTabsRef = useRef(activeTabs);
  useEffect(() => {
    activeTabsRef.current = activeTabs;
  }, [activeTabs]);

  // Auto-save local tabs and sync to Firestore
  useEffect(() => {
    localStorage.setItem('@helpdesk:activeTabs', JSON.stringify(activeTabs));
    localStorage.setItem('@helpdesk:currentTabId', currentTabId);
  }, [activeTabs, currentTabId]);

  // Sync draft tickets to Firestore every 5 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      activeTabsRef.current.forEach(async (tab) => {
        try {
          const { isDraft, ...ticketData } = tab;
          await setDoc(doc(db, 'tickets', tab.id), {
             ...ticketData,
             status: tab.status === 'FINALIZADO' ? 'FINALIZADO' : 'EM_ANDAMENTO'
          }, { merge: true });
        } catch (error) {
          console.error("Auto-save to Firestore failed", error);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleDeleteTicket = async (id: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'tickets', id), { deleted: true }, { merge: true }); 
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tickets/${id}`);
    }
  };
  
  const handleNewTicket = () => {
    const newId = Math.floor(100000 + Math.random() * 900000).toString();
    const newTicket: ActiveTicket = {
      id: newId,
      status: 'EM_ANDAMENTO',
      description: '',
      networkLogin: '',
      extension: '',
      mobile: '',
      clientEmail: '',
      microLogicalAddress: '',
      printerLogicalAddress: '',
      monitorLogicalAddress: '',
      otherLogicalAddress: '',
      createdAt: new Date().toISOString(),
      durationSeconds: 0,
      isDraft: true,
      isPaused: false,
    };
    
    setActiveTabs(prev => [...prev, newTicket]);
    setCurrentTabId(newId);
    setActiveSidebarItem('Atendimento');
  };

  const handleDuplicateTicket = (sourceTicket: ActiveTicket) => {
    const newId = Math.floor(100000 + Math.random() * 900000).toString();
    const newTicket: ActiveTicket = {
      ...sourceTicket,
      id: newId,
      description: '',
      category: '',
      durationSeconds: 0,
      status: 'EM_ANDAMENTO',
      createdAt: new Date().toISOString(),
      finishedAt: undefined,
      isDraft: true,
      isPaused: true,
      structuredResult: '',
    };
    
    setActiveTabs(prev => [...prev, newTicket]);
    setCurrentTabId(newId);
  };

  const handleEditTicket = (id: string) => {
    const ticketToEdit = tickets.find(t => t.id === id);
    if (!ticketToEdit) return;

    setActiveTabs(prev => {
      const alreadyOpen = prev.find(t => t.id === id);
      if (alreadyOpen) return prev;
      return [...prev, {
        ...ticketToEdit,
        isDraft: true,
        isPaused: true,
      }];
    });
    
    setCurrentTabId(id);
    setActiveSidebarItem('Atendimento');
  };

  const handleCloseTab = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveTabs(prev => {
      const newTabs = prev.filter(t => t.id !== id);
      if (currentTabId === id) {
        setCurrentTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'dashboard');
      }
      return newTabs;
    });
  };

  const handleUpdateActiveTicket = (updatedTicket: ActiveTicket) => {
    setActiveTabs(tabs => tabs.map(t => t.id === updatedTicket.id ? updatedTicket : t));
  };

  const handleFinishTicket = async (ticketToFinish: ActiveTicket) => {
    const { isDraft, ...rest } = ticketToFinish;
    const finished: Ticket = {
      ...rest,
      status: 'FINALIZADO',
      finishedAt: new Date().toISOString(),
    };
    
    // Save to Firestore
    if (user) {
      try {
        await setDoc(doc(db, 'tickets', finished.id), finished);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `tickets/${finished.id}`);
      }
    }
    
    // Close the tab
    setActiveTabs(prev => {
      const newTabs = prev.filter(t => t.id !== ticketToFinish.id);
      if (currentTabId === ticketToFinish.id) {
        setCurrentTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'dashboard');
      }
      return newTabs;
    });
  };

  const handleUpdateTicket = async (updatedTicket: Ticket) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'tickets', updatedTicket.id), updatedTicket);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tickets/${updatedTicket.id}`);
    }
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  const currentActiveTicket = activeTabs.find(t => t.id === currentTabId);

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans">
      <Sidebar 
        activeItem={activeSidebarItem}
        onNavigate={setActiveSidebarItem}
        appSettings={appSettings}
        onUpdateSettings={handleUpdateSettings}
      />
      
      <main className="flex-1 ml-64 flex flex-col min-w-0">
        {activeSidebarItem === 'Configurações' ? (
          <>
            <header className="bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between px-8 h-20">
                <h2 className="text-lg font-semibold text-slate-900">Configurações do Sistema</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Clique para alternar o Provedor de IA"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {appSettings.aiProvider === 'openrouter' ? `OpenRouter (${getModelFriendlyName(appSettings.openRouterModel)})` : 'Gemini (Google)'}
                  </button>
                  <button 
                    onClick={() => signOut(auth)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair da conta
                  </button>
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8">
              {dbLoading ? (
                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : (
                <SettingsPanel appSettings={appSettings} onUpdateSettings={handleUpdateSettings} />
              )}
            </div>
          </>
        ) : activeSidebarItem === 'SLA' ? (
          <>
            <header className="bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between px-8 h-20">
                <div className="flex items-center gap-3">
                  <Layout className="h-5 w-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-900">Dashboard de SLA</h2>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Clique para alternar o Provedor de IA"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {appSettings.aiProvider === 'openrouter' ? `OpenRouter (${getModelFriendlyName(appSettings.openRouterModel)})` : 'Gemini (Google)'}
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
              <div className="max-w-6xl mx-auto">
                <SLADashboard tickets={tickets} appSettings={appSettings} />
              </div>
            </div>
          </>
        ) : activeSidebarItem === 'FAQs' ? (
          <>
            <header className="bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between px-8 h-20">
                <div className="flex items-center gap-3">
                  <Layout className="h-5 w-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-900">Base de Conhecimento (FAQs)</h2>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Clique para alternar o Provedor de IA"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {appSettings.aiProvider === 'openrouter' ? `OpenRouter (${getModelFriendlyName(appSettings.openRouterModel)})` : 'Gemini (Google)'}
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto">
                <FaqPanel appSettings={appSettings} onUpdateSettings={handleUpdateSettings} tickets={tickets} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Top Header & Tabs for Atendimento */}
            <header className="bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center px-8 h-20 justify-between">
                <div className="flex items-center gap-3">
                  <Layout className="h-5 w-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-900">{activeSidebarItem}</h2>
                </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Clique para alternar o Provedor de IA"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {appSettings.aiProvider === 'openrouter' ? `OpenRouter (${getModelFriendlyName(appSettings.openRouterModel)})` : 'Gemini (Google)'}
                </button>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center">ONLINE ({user.displayName || user.email})</span>
                <button 
                  onClick={handleNewTicket}
                  className="px-4 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full hover:bg-blue-200 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  NOVO CHAMADO
                </button>
              </div>
            </div>
          </div>
          
          {activeSidebarItem === 'Atendimento' && (
            <div className="flex items-end px-8 gap-1 overflow-x-auto bg-slate-50/80 pt-2 border-t border-slate-100">
              <button
                onClick={() => setCurrentTabId('dashboard')}
                className={cn(
                  "px-5 py-3 text-sm font-semibold border-b-2 transition-colors rounded-t-lg mt-1",
                  currentTabId === 'dashboard' 
                    ? "border-blue-500 text-blue-600 bg-white" 
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                )}
              >
                Visão Geral
              </button>
              
              {activeTabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => setCurrentTabId(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors group rounded-t-lg mt-1",
                    currentTabId === tab.id
                      ? "border-blue-500 text-blue-600 bg-white" 
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {tab.id}
                  <button 
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="p-0.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeSidebarItem === 'Atendimento' ? (
              currentTabId === 'dashboard' ? (
                dbLoading ? (
                  <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                ) : (
                  <>
                    {activeTabs.length === 0 && (
                      <div className="bg-white border border-slate-200 border-dashed rounded-xl p-8 text-center shadow-sm">
                        <p className="text-slate-500 mb-4 font-medium">Nenhum chamado em andamento. Clique em <strong className="text-slate-700">NOVO CHAMADO</strong> para começar — o cronômetro inicia automaticamente.</p>
                        <button 
                          onClick={handleNewTicket}
                          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                          Novo chamado
                        </button>
                      </div>
                    )}
                    
                    <TicketList tickets={tickets} appSettings={appSettings} onDelete={handleDeleteTicket} onEdit={handleEditTicket} onUpdate={handleUpdateTicket} />
                  </>
                )
              ) : (
                currentActiveTicket && (
                  <>
                    <TicketForm 
                      ticket={currentActiveTicket} 
                      isActive={currentTabId === currentActiveTicket.id}
                      onUpdate={handleUpdateActiveTicket}
                      onFinish={handleFinishTicket}
                      onDuplicate={handleDuplicateTicket}
                      onUpdateSettings={handleUpdateSettings}
                      appSettings={appSettings}
                      onNavigate={(route) => setActiveSidebarItem(route)}
                      finishedTickets={tickets.filter(t => t.status === 'FINALIZADO')}
                    />
                    <div className="mt-12 pt-12 border-t border-slate-200">
                      <h3 className="text-xl font-bold text-slate-800 mb-8">Dashboard e Histórico</h3>
                      <div className="space-y-8">
                        <TicketList tickets={tickets} appSettings={appSettings} onDelete={handleDeleteTicket} onEdit={handleEditTicket} onUpdate={handleUpdateTicket} />
                      </div>
                    </div>
                  </>
                )
              )
            ) : activeSidebarItem === 'FAQs' ? (
              <FaqPanel appSettings={appSettings} onUpdateSettings={handleUpdateSettings} tickets={tickets} />
            ) : activeSidebarItem === 'Orientações' ? (
              <ProcedurePanel appSettings={appSettings} onUpdateSettings={handleUpdateSettings} />
            ) : activeSidebarItem === 'Informações' ? (
              <InformationPanel appSettings={appSettings} onUpdateSettings={handleUpdateSettings} />
            ) : activeSidebarItem === 'Configurações' ? (
              <SettingsPanel appSettings={appSettings} onUpdateSettings={handleUpdateSettings} />
            ) : activeSidebarItem === 'Ferramentas' ? (
              <ToolsPanel appSettings={appSettings} onUpdateSettings={handleUpdateSettings} />
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-500 font-medium">Conteúdo de {activeSidebarItem} em construção...</p>
              </div>
            )}
          </div>
        </div>
      </>
        )}
      </main>

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                Alternar Provedor de IA
              </h3>
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Selecione qual Inteligência Artificial deseja utilizar para estruturar e resumir os chamados:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    handleUpdateSettings({ ...appSettings, aiProvider: 'gemini' });
                    setIsAiModalOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                    appSettings.aiProvider !== 'openrouter'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">Gemini (Google)</div>
                    <div className="text-xs text-slate-500 mt-0.5">Usa a API nativa do Google Gemini 2.5 Flash</div>
                  </div>
                  {appSettings.aiProvider !== 'openrouter' && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                  )}
                </button>

                <button
                  onClick={() => {
                    handleUpdateSettings({ ...appSettings, aiProvider: 'openrouter' });
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                    appSettings.aiProvider === 'openrouter'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">OpenRouter</div>
                    <div className="text-xs text-slate-500 mt-0.5">Usa a API do OpenRouter com o modelo {getModelFriendlyName(appSettings.openRouterModel)}</div>
                  </div>
                  {appSettings.aiProvider === 'openrouter' && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                  )}
                </button>
              </div>

              {appSettings.aiProvider === 'openrouter' && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Modelo OpenRouter (Grátis)</label>
                  <select
                    value={appSettings.openRouterModel || 'google/gemini-2.5-flash:free'}
                    onChange={(e) => {
                      handleUpdateSettings({ ...appSettings, openRouterModel: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="google/gemini-2.5-flash:free">Gemini 2.5 Flash Free (Google)</option>
                    <option value="deepseek/deepseek-r1:free">DeepSeek R1 Free (DeepSeek)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Instruct Free (Meta)</option>
                    <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B Instruct Free (Meta)</option>
                    <option value="qwen/qwen-2.5-72b-instruct:free">Qwen 2.5 72B Instruct Free (Qwen)</option>
                    <option value="microsoft/phi-3-medium-128k-instruct:free">Phi-3 Medium 128k Instruct Free (Microsoft)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Como esses modelos são gratuitos no OpenRouter, se um deles estiver lento ou congestionado, basta selecionar outro aqui mesmo para continuar usando sem interrupções!
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
