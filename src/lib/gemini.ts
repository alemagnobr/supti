import { GoogleGenAI } from '@google/genai';

// WARNING: Using the Gemini API directly from the client exposes the API key to the browser.
// This is done because the user explicitly requested a client-side only app for GitHub pages,
// and they will be providing their own API key via the UI.

async function fetchOpenRouter(
  apiKey: string,
  model: string,
  messages: any[],
  extraBody: Record<string, any> = {}
): Promise<any> {
  const payload = {
    model: model,
    messages: messages,
    ...extraBody
  };

  let res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai.studio.google.com/',
      'X-Title': 'SLA Tracker AI'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errorText = '';
    try {
      const errorData = await res.json();
      errorText = errorData.error?.message || res.statusText;
    } catch (e) {
      errorText = res.statusText;
    }

    // Check if error contains model fallback instruction
    if (errorText.includes('use this slug instead:')) {
      const match = errorText.match(/use this slug instead:\s*([a-zA-Z0-9\-\/_.:]+)/);
      if (match && match[1]) {
        const fallbackModel = match[1].trim();
        console.warn(`Retrying OpenRouter with suggested model slug: ${fallbackModel}`);
        
        const retryPayload = {
          ...payload,
          model: fallbackModel
        };

        const retryRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://ai.studio.google.com/',
            'X-Title': 'SLA Tracker AI'
          },
          body: JSON.stringify(retryPayload)
        });

        if (retryRes.ok) {
          return await retryRes.json();
        } else {
          let retryErrorText = '';
          try {
            const retryErrorData = await retryRes.json();
            retryErrorText = retryErrorData.error?.message || retryRes.statusText;
          } catch (e) {
            retryErrorText = retryRes.statusText;
          }
          throw new Error(`OpenRouter API Error (Retry failed): ${retryErrorText}`);
        }
      }
    }

    throw new Error(`OpenRouter API Error: ${errorText}`);
  }

  return await res.json();
}

export const generateTicketStructure = async (
  apiKey: string,
  provider: 'gemini' | 'openrouter',
  data: any
) => {
  const { description, procedures, verifications, problemSolved, clientValidated, isEscalated, aiGuidelines, aiPromptStandard, aiPromptEscalated, escalationDetails, closingText } = data;

  let prompt = '';
  
  let guidelinesContext = '';
  if (aiGuidelines && aiGuidelines.length > 0) {
    const guidelinesList = aiGuidelines.map((g: string) => `- ${g}`).join('\n');
    guidelinesContext = `\n\nIMPORTANTE: Siga rigorosamente as seguintes diretrizes ao estruturar a sua resposta:\n${guidelinesList}`;
  }

  if (isEscalated) {
    let proceduresContext = '';
    if (procedures && procedures.length > 0) {
      const proceduresList = procedures.map((p: any) => `- ${p.name}: ${p.description}`).join('\n');
      proceduresContext += `\nAlém disso, os seguintes procedimentos foram executados, mas o incidente persiste:\n${proceduresList}\nInclua menção a esses procedimentos executados na sua tratativa.`;
    }
    if (verifications && verifications.length > 0) {
      const verificationsList = verifications.map((v: any) => `- ${v.name}: ${v.description}`).join('\n');
      proceduresContext += `\nTambém foram realizadas as seguintes verificações:\n${verificationsList}\nInclua menção a essas verificações na sua tratativa.`;
    }

    let basePrompt = aiPromptEscalated || `Você é um assistente técnico de TI. 
Eu vou te enviar um texto relatando um problema ou atendimento de suporte que está sendo ESCALONADO para outro setor.
Sua tarefa é extrair o resumo da solicitação e descrever a tratativa realizada de forma profissional e técnica.
Corrija erros ortográficos.
NÃO invente procedimentos não mencionados.{proceduresContext}{guidelinesContext}

O texto original é:
"{description}"`;

    let htmlFormattingContext = `

Sua resposta DEVE CONTER ÚNICA E EXCLUSIVAMENTE o código HTML. 
NÃO ESCREVA "Demanda: ...", "Tratativa: ..." ou qualquer outro texto antes ou depois da estrutura HTML.
NÃO USE blocos de código markdown (como \`\`\`html). Devolva apenas as tags HTML.

Formate a saída EXATAMENTE como o código HTML abaixo, substituindo os colchetes com os dados do atendimento:

<!-- ENCAMINHAMENTO PARA ATENDIMENTO ESPECIALIZADO – MODELO PARA ATENDENTE -->
<div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#111827"><!-- TEXTO INICIAL -->
<div style="font-size:12px; color:#000000; margin-bottom:8px"><strong>Prezados,</strong><br />
<br />
<strong>A solicitação</strong>:&nbsp;[Resumo da solicitação/demanda em uma frase concisa]</div>
<!-- CAIXA BASE -->
<div style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 14px; background:#fafafa; margin-top:10px; margin-right:0; margin-bottom:10px; margin-left:0"><!-- ATENDIMENTO ESPECIALIZADO -->
<div style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; margin-bottom:8px; background:#ffffff">
<div style="font-weight:bold; margin-bottom:4px"><u>A tratativa</u></div>
<div>[Relato do que foi feito e procedimentos realizados, formando um parágrafo claro. Termine obrigatoriamente com a frase: Após tratativas realizadas pelo analista de Nível 1, verificou-se a necessidade de atendimento especializado para solução do chamado.]</div>
</div>
<!-- LOCALIZAÇÃO -->
<div style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; background:#ffffff">
<div style="font-weight:bold; margin-bottom:4px"><u>Localização</u></div>
<div>${(escalationDetails ? `Setor: ${escalationDetails.setor || ''}
Edifício: ${escalationDetails.edificio || ''}
Complemento: ${escalationDetails.complemento || ''}
Ponto de referência: ${escalationDetails.pontoReferencia || ''}
Contato: ${escalationDetails.contato || ''}
Setor: ${escalationDetails.setorAbertoFechado === 'Aberto' ? '(X) Aberto    ( ) Fechado' : escalationDetails.setorAbertoFechado === 'Fechado' ? '( ) Aberto    (X) Fechado' : '( ) Aberto    ( ) Fechado'}
Local: ${escalationDetails.local === 'Teletrabalho' ? '(X) Teletrabalho    ( ) Senado    ( ) Externo' : escalationDetails.local === 'Senado' ? '( ) Teletrabalho    (X) Senado    ( ) Externo' : escalationDetails.local === 'Externo' ? '( ) Teletrabalho    ( ) Senado    (X) Externo' : '( ) Teletrabalho    ( ) Senado    ( ) Externo'}` : 'Setor:\nEdifício:\nComplemento:\nPonto de referência:\nContato:\nSetor:  ( ) Aberto    ( ) Fechado\nLocal:  ( ) Teletrabalho    ( ) Senado    ( ) Externo').replace(/\n/g, '</div>\n<div>')}</div>
</div>
</div>
<!-- /CAIXA BASE -->`;

    if (closingText) {
      htmlFormattingContext += `\n<!--{cke_protected}{C}%3C!%2D%2D%20ASSINATURA%20%2D%2D%3E-->\n<div style="margin-top:8px; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; background:#ffffff">\n<div>${closingText.trim().replace(/\n/g, '<br>')}</div>\n</div>`;
    }

    htmlFormattingContext += `\n</div>`;

    if (aiPromptEscalated && !aiPromptEscalated.includes('{description}')) {
       basePrompt += `\n\nO texto é:\n"{description}"\n\n{proceduresContext}{guidelinesContext}`;
    }

    prompt = (basePrompt + htmlFormattingContext)
      .replace('{description}', description)
      .replace('{proceduresContext}', proceduresContext)
      .replace('{guidelinesContext}', guidelinesContext);

  } else {
    let proceduresContext = '';
    if (procedures && procedures.length > 0) {
      const proceduresList = procedures.map((p: any) => `- ${p.name}: ${p.description}`).join('\n');
      proceduresContext += `\nAlém disso, considere que os seguintes procedimentos TÉCNICOS também foram executados com sucesso:\n${proceduresList}\nInclua menção direta a esses procedimentos na seção "Ações realizadas", de forma técnica.`;
    }
    if (verifications && verifications.length > 0) {
      const verificationsList = verifications.map((v: any) => `- ${v.name}: ${v.description}`).join('\n');
      proceduresContext += `\nTambém foram realizadas as seguintes verificações com sucesso:\n${verificationsList}\nInclua menção a essas verificações na seção "Ações realizadas", de forma técnica.`;
    }

    let validationContext = '';
    if (!isEscalated) {
      let sentences = [];
      if (problemSolved) {
        sentences.push('Após os procedimentos, o problema foi solucionado!');
      }
      
      if (clientValidated !== undefined) {
        sentences.push(clientValidated ? 'Cliente validou o chamado!' : 'Cliente não validou o chamado.');
      }
      
      if (sentences.length > 0) {
        validationContext = `\n\nATENÇÃO: Adicione OBRIGATORIAMENTE as seguintes frases APENAS dentro da div de "Resultado" (junto ao resultado final). NÃO as adicione no final da resposta e NÃO as adicione na div da pesquisa de satisfação:\n${sentences.join('\n')}`;
      }
    }

    let basePrompt = aiPromptStandard || `Você é um assistente técnico de TI. 
Eu vou te enviar um texto relatando um problema ou atendimento de suporte.
Sua tarefa é reestruturar esse texto nos tópicos: "Análise técnica", "Ações realizadas" e "Resultado", formatados em HTML.
Corrija erros ortográficos e use linguagem profissional e técnica.
NÃO invente procedimentos ou informações que não estão no texto original nem na lista de procedimentos executados.
NÃO "encha linguiça" ou adicione detalhes não mencionados.{proceduresContext}{validationContext}{guidelinesContext}

O texto é:
"{description}"`;

    let htmlFormattingContext = `

Sua resposta DEVE CONTER ÚNICA E EXCLUSIVAMENTE o código HTML. 
NÃO ESCREVA "Demanda: ...", "Tratativa: ..." ou qualquer outro texto antes ou depois da estrutura HTML.
NÃO USE blocos de código markdown (como \`\`\`html). Devolva apenas as tags HTML.

Formate a saída EXATAMENTE como o código HTML abaixo, substituindo os colchetes com os dados do atendimento:

<div style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 14px; background:#fafafa; margin-top:10px; margin-right:0; margin-bottom:10px; margin-left:0">
<div style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; margin-bottom:8px; background:#ffffff">
<div style="font-weight:bold; margin-bottom:4px">Análise técnica:</div>
<div>[Análise técnica do que o cliente informou]</div>
</div>
<!--{cke_protected}{C}%3C!%2D%2D%20A%C3%87%C3%95ES%20REALIZADAS%20%2D%2D%3E-->
<div style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; margin-bottom:8px; background:#ffffff">
<div style="font-weight:bold; margin-bottom:4px">Ações realizadas:</div>
<ul>
<li>[ação 1]</li>
<li>[ação 2]</li>
</ul>
</div>
<!--{cke_protected}{C}%3C!%2D%2D%20RESULTADO%20%2D%2D%3E-->
<div style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; margin-bottom:8px; background:#ffffff">
<div style="font-weight:bold; margin-bottom:4px">Resultado:</div>
<div>[Resultado final após as ações. ATENÇÃO: As frases de validação (se houver) devem ficar AQUI!]</div>
</div>
<!--{cke_protected}{C}%3C!%2D%2D%20NOTA%20SOBRE%20PESQUISA%20DE%20SATISFA%C3%87%C3%83O%20%2D%2D%3E-->
<div style="border:1px solid #f59e0b; border-radius:10px; padding:10px 12px; background:#fffbeb; color:#92400e">
<div style="font-weight:bold; margin-bottom:4px">Sua opinião é importante!</div>
<div>Após o fechamento deste chamado, <em><u>você receberá um novo e-mail com um link para a pesquisa de satisfação</u></em>. Sua participação é muito importante para melhorarmos continuamente nosso atendimento.<br><br>Muito obrigado!</div>
</div>
</div>`;

    if (aiPromptStandard && !aiPromptStandard.includes('{description}')) {
       basePrompt += `\n\nO texto é:\n"{description}"\n\n{proceduresContext}{validationContext}{guidelinesContext}`;
    }

    prompt = (basePrompt + htmlFormattingContext)
      .replace('{description}', description)
      .replace('{proceduresContext}', proceduresContext)
      .replace('{guidelinesContext}', guidelinesContext)
      .replace('{validationContext}', validationContext);
  }

  if (provider === 'openrouter') {
    const responseData = await fetchOpenRouter(
      apiKey,
      data.openRouterModel || 'google/gemini-2.5-flash:free',
      [{ role: 'user', content: prompt }],
      { max_tokens: 4000 }
    );
    return responseData.choices?.[0]?.message?.content || '';
  } else {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  }
};

export const searchSolutions = async (apiKey: string, provider: 'gemini' | 'openrouter', data: any) => {
  const { description, faqs, procedures, orientations, tickets } = data;
  
  const prompt = `Você é um assistente técnico de TI. 
Sua tarefa é analisar o relato de um problema e buscar na base de conhecimento (FAQs, Procedimentos, Orientações e Chamados Anteriores) os itens mais relevantes que possam ajudar a resolver o problema.

RELATO DO PROBLEMA:
"${description}"

BASE DE CONHECIMENTO (IDs e Textos):
FAQs: ${JSON.stringify((faqs || []).map((f: any) => ({ id: f.id, text: f.name + ' ' + f.subject + ' ' + f.technicalInfo })))}
Procedimentos: ${JSON.stringify((procedures || []).map((p: any) => ({ id: p.id, text: p.name + ' ' + p.description })))}
Orientações: ${JSON.stringify((orientations || []).map((o: any) => ({ id: o.id, text: o.name + ' ' + o.description })))}
Chamados Anteriores: ${JSON.stringify((tickets || []).map((t: any) => ({ id: t.id, text: t.description })))}

Retorne APENAS um objeto JSON no seguinte formato, listando os IDs dos itens mais relevantes encontrados (máximo 3 de cada). Se não encontrar nada, retorne arrays vazios.
{
  "faqs": ["id1", "id2"],
  "procedures": ["id1"],
  "orientations": ["id1"],
  "tickets": ["id1"]
}`;

  if (provider === 'openrouter') {
    const responseData = await fetchOpenRouter(
      apiKey,
      data.openRouterModel || 'google/gemini-2.5-flash:free',
      [{ role: 'user', content: prompt }],
      { response_format: { type: 'json_object' }, max_tokens: 1000 }
    );
    const resultText = responseData.choices?.[0]?.message?.content || '{}';
    
    try {
      const parsed = JSON.parse(resultText);
      return {
        faqs: parsed.faqs || [],
        procedures: parsed.procedures || [],
        orientations: parsed.orientations || [],
        tickets: parsed.tickets || []
      };
    } catch (e) {
      return { faqs: [], procedures: [], orientations: [], tickets: [] };
    }
  } else {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            faqs: { type: "array", items: { type: "string" } },
            procedures: { type: "array", items: { type: "string" } },
            orientations: { type: "array", items: { type: "string" } },
            tickets: { type: "array", items: { type: "string" } }
          }
        }
      }
    });

    const resultText = response.text;
    let resultJson = { faqs: [], procedures: [], orientations: [], tickets: [] };
    if (resultText) {
      try {
        resultJson = JSON.parse(resultText);
      } catch (e) {
        console.error("Failed to parse AI response as JSON", e);
      }
    }
    return resultJson;
  }
};

export function formatAiError(errorMsg: string, provider: 'gemini' | 'openrouter'): string {
  try {
    const parsed = JSON.parse(errorMsg);
    if (parsed.error) {
      const innerMessage = parsed.error.message || '';
      const status = parsed.error.status || '';
      
      if (status === 'PERMISSION_DENIED' || innerMessage.includes('permission') || innerMessage.includes('denied')) {
        return `Acesso Negado (403): O Google Gemini recusou a chamada. Verifique se a sua Chave de API do Gemini nas Configurações é válida, está ativa e possui permissão para o modelo 'gemini-2.5-flash'.`;
      }
      
      return `${status ? `Erro [${status}]: ` : ''}${innerMessage || errorMsg}`;
    }
  } catch (e) {
    // Not a JSON string, continue with regex/string checks
  }

  const lowerMsg = errorMsg.toLowerCase();
  
  if (lowerMsg.includes('permission_denied') || lowerMsg.includes('caller does not have permission') || lowerMsg.includes('403')) {
    return `Acesso Negado: Chave de API do Gemini inválida ou sem permissão. Por favor, verifique se inseriu a chave correta e se ela está ativa no console do Google AI Studio.`;
  }
  
  if (lowerMsg.includes('api key not found') || lowerMsg.includes('invalid api key') || lowerMsg.includes('api_key_invalid')) {
    return `Chave de API inválida: A chave fornecida para o provedor ${provider === 'gemini' ? 'Gemini' : 'OpenRouter'} não é válida. Verifique se copiou a chave inteira corretamente nas Configurações.`;
  }

  if (lowerMsg.includes('unavailable') && lowerMsg.includes('free')) {
    return `Modelo Gratuito Indisponível: O modelo gratuito selecionado no OpenRouter está temporariamente indisponível ou com limite excedido. Tente selecionar outro modelo gratuito (como DeepSeek R1 Free, Llama 3.3 Free ou Qwen 2.5 Free) no menu de IA na barra superior ou nas Configurações, ou use o Google Gemini diretamente!`;
  }
  
  if (lowerMsg.includes('credit') || lowerMsg.includes('insufficient_funds') || lowerMsg.includes('balance') || lowerMsg.includes('insufficient credits')) {
    return `Crédito Insuficiente: Sua conta no OpenRouter não possui saldo/crédito para realizar essa chamada com o modelo pago recomendado de fallback. Por favor, adicione saldo ao OpenRouter ou use o Google Gemini diretamente.`;
  }

  return errorMsg;
}

