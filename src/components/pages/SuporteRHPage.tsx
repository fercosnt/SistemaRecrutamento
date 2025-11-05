import React, { useState } from 'react';
import { RHLayout } from '../RHLayout';
import { Glass, GlassButton } from '../ui/glass';
import { 
  Bug, 
  Lightbulb, 
  HelpCircle, 
  AlertTriangle,
  Send,
  CheckCircle2,
  Upload,
  X,
  FileText
} from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';

type TipoSolicitacao = 'erro' | 'melhoria' | 'duvida' | 'outro';
type Severidade = 'baixa' | 'media' | 'alta' | 'critica';

interface FormData {
  tipo: TipoSolicitacao;
  titulo: string;
  descricao: string;
  severidade: Severidade;
  pagina: string;
  passos: string;
  comportamentoEsperado: string;
  comportamentoAtual: string;
  navegador: string;
  anexos: File[];
}

export function SuporteRHPage() {
  const [currentPage, setCurrentPage] = useState('suporte-rh');
  const [enviado, setEnviado] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    tipo: 'erro',
    titulo: '',
    descricao: '',
    severidade: 'media',
    pagina: '',
    passos: '',
    comportamentoEsperado: '',
    comportamentoAtual: '',
    navegador: '',
    anexos: [],
  });

  const paginas = [
    'Dashboard',
    'Vagas',
    'Candidatos',
    'Perfil de Candidato',
    'Criar/Editar Vaga',
    'Configurações',
    'Meu Perfil',
    'Vagas Públicas',
    'Outra',
  ];

  const navegadores = [
    'Google Chrome',
    'Mozilla Firefox',
    'Safari',
    'Microsoft Edge',
    'Outro',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const novosArquivos = Array.from(e.target.files);
      setFormData({
        ...formData,
        anexos: [...formData.anexos, ...novosArquivos],
      });
    }
  };

  const removerAnexo = (index: number) => {
    setFormData({
      ...formData,
      anexos: formData.anexos.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Aqui você enviaria os dados para o backend
    console.log('Formulário enviado:', formData);
    
    // Simular envio
    setEnviado(true);
    
    // Reset após 3 segundos
    setTimeout(() => {
      setEnviado(false);
      setFormData({
        tipo: 'erro',
        titulo: '',
        descricao: '',
        severidade: 'media',
        pagina: '',
        passos: '',
        comportamentoEsperado: '',
        comportamentoAtual: '',
        navegador: '',
        anexos: [],
      });
    }, 3000);
  };

  const getTipoIcon = (tipo: TipoSolicitacao) => {
    switch (tipo) {
      case 'erro':
        return <Bug className="w-5 h-5" />;
      case 'melhoria':
        return <Lightbulb className="w-5 h-5" />;
      case 'duvida':
        return <HelpCircle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getSeveridadeBadge = (severidade: Severidade) => {
    switch (severidade) {
      case 'critica':
        return 'bg-red-500/20 text-red-200 border-red-300/30';
      case 'alta':
        return 'bg-orange-500/20 text-orange-200 border-orange-300/30';
      case 'media':
        return 'bg-yellow-500/20 text-yellow-200 border-yellow-300/30';
      case 'baixa':
        return 'bg-green-500/20 text-green-200 border-green-300/30';
    }
  };

  if (enviado) {
    return (
      <RHLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Glass variant="white" blur="lg" className="p-12 rounded-xl max-w-md w-full text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-300" />
              </div>
            </div>
            <h2 className="text-white drop-shadow-lg mb-4">Solicitação Enviada!</h2>
            <p className="text-white/80 drop-shadow-md mb-6">
              Recebemos sua solicitação e nossa equipe técnica irá analisá-la em breve.
              Você receberá atualizações por e-mail.
            </p>
            <div className="text-white/60 drop-shadow-sm text-sm">
              Redirecionando...
            </div>
          </Glass>
        </div>
      </RHLayout>
    );
  }

  return (
    <RHLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      <div className="space-y-6 pb-32">
        {/* HEADER */}
        <Glass variant="white" blur="lg" className="p-8 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#35BFAD]/20 flex items-center justify-center flex-shrink-0">
              <Bug className="w-6 h-6 text-[#35BFAD]" />
            </div>
            <div className="flex-1">
              <h1 className="text-white drop-shadow-lg mb-2">
                🛠️ Suporte Técnico
              </h1>
              <p className="text-white/80 drop-shadow-md">
                Relate erros, sugira melhorias ou tire dúvidas sobre o sistema.
                Quanto mais detalhes você fornecer, mais rápido conseguiremos ajudar!
              </p>
            </div>
          </div>
        </Glass>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TIPO DE SOLICITAÇÃO */}
          <Glass variant="white" blur="lg" className="p-8 rounded-xl">
            <h2 className="text-white drop-shadow-lg mb-6">
              Tipo de Solicitação
            </h2>
            
            <RadioGroup
              value={formData.tipo}
              onValueChange={(value) =>
                setFormData({ ...formData, tipo: value as TipoSolicitacao })
              }
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <label
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  formData.tipo === 'erro'
                    ? 'bg-white/25 border-2 border-white/40'
                    : 'bg-white/10 border-2 border-white/20 hover:bg-white/15'
                }`}
              >
                <RadioGroupItem value="erro" id="erro" className="border-white/40" />
                <div className="flex items-center gap-3 flex-1">
                  <Bug className="w-5 h-5 text-red-300" />
                  <div>
                    <div className="text-white drop-shadow-sm">🐛 Erro / Bug</div>
                    <div className="text-white/60 text-sm">Algo não está funcionando</div>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  formData.tipo === 'melhoria'
                    ? 'bg-white/25 border-2 border-white/40'
                    : 'bg-white/10 border-2 border-white/20 hover:bg-white/15'
                }`}
              >
                <RadioGroupItem value="melhoria" id="melhoria" className="border-white/40" />
                <div className="flex items-center gap-3 flex-1">
                  <Lightbulb className="w-5 h-5 text-yellow-300" />
                  <div>
                    <div className="text-white drop-shadow-sm">💡 Melhoria</div>
                    <div className="text-white/60 text-sm">Sugestão de recurso</div>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  formData.tipo === 'duvida'
                    ? 'bg-white/25 border-2 border-white/40'
                    : 'bg-white/10 border-2 border-white/20 hover:bg-white/15'
                }`}
              >
                <RadioGroupItem value="duvida" id="duvida" className="border-white/40" />
                <div className="flex items-center gap-3 flex-1">
                  <HelpCircle className="w-5 h-5 text-blue-300" />
                  <div>
                    <div className="text-white drop-shadow-sm">❓ Dúvida</div>
                    <div className="text-white/60 text-sm">Como usar algo</div>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  formData.tipo === 'outro'
                    ? 'bg-white/25 border-2 border-white/40'
                    : 'bg-white/10 border-2 border-white/20 hover:bg-white/15'
                }`}
              >
                <RadioGroupItem value="outro" id="outro" className="border-white/40" />
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-gray-300" />
                  <div>
                    <div className="text-white drop-shadow-sm">📋 Outro</div>
                    <div className="text-white/60 text-sm">Outro tipo de solicitação</div>
                  </div>
                </div>
              </label>
            </RadioGroup>
          </Glass>

          {/* INFORMAÇÕES BÁSICAS */}
          <Glass variant="white" blur="lg" className="p-8 rounded-xl">
            <h2 className="text-white drop-shadow-lg mb-6">
              Informações Básicas
            </h2>

            <div className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <Label className="text-white/90 drop-shadow-sm">
                  Título / Resumo *
                </Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  placeholder="Ex: Erro ao salvar vaga com caracteres especiais"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  required
                />
              </div>

              {/* Severidade e Página */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/90 drop-shadow-sm">
                    Severidade *
                  </Label>
                  <Select
                    value={formData.severidade}
                    onValueChange={(value) =>
                      setFormData({ ...formData, severidade: value as Severidade })
                    }
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                      <SelectItem value="baixa" className="hover:bg-white/10">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeveridadeBadge('baixa')}>Baixa</Badge>
                          <span>- Cosmético/Menor</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="media" className="hover:bg-white/10">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeveridadeBadge('media')}>Média</Badge>
                          <span>- Afeta o uso</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="alta" className="hover:bg-white/10">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeveridadeBadge('alta')}>Alta</Badge>
                          <span>- Impede funcionalidade</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="critica" className="hover:bg-white/10">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeveridadeBadge('critica')}>Crítica</Badge>
                          <span>- Sistema travado</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 drop-shadow-sm">
                    Página Afetada *
                  </Label>
                  <Select
                    value={formData.pagina}
                    onValueChange={(value) =>
                      setFormData({ ...formData, pagina: value })
                    }
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Selecione a página" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                      {paginas.map((pagina) => (
                        <SelectItem
                          key={pagina}
                          value={pagina}
                          className="hover:bg-white/10"
                        >
                          {pagina}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Navegador */}
              <div className="space-y-2">
                <Label className="text-white/90 drop-shadow-sm">
                  Navegador Utilizado
                </Label>
                <Select
                  value={formData.navegador}
                  onValueChange={(value) =>
                    setFormData({ ...formData, navegador: value })
                  }
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Selecione o navegador" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                    {navegadores.map((nav) => (
                      <SelectItem
                        key={nav}
                        value={nav}
                        className="hover:bg-white/10"
                      >
                        {nav}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Glass>

          {/* DESCRIÇÃO DETALHADA */}
          <Glass variant="white" blur="lg" className="p-8 rounded-xl">
            <h2 className="text-white drop-shadow-lg mb-6">
              Descrição Detalhada
            </h2>

            <div className="space-y-6">
              {/* Descrição Geral */}
              <div className="space-y-2">
                <Label className="text-white/90 drop-shadow-sm">
                  Descrição Completa *
                </Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Descreva o problema ou solicitação com o máximo de detalhes possível..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[120px] resize-none"
                  required
                />
              </div>

              {/* Passos para Reproduzir */}
              {(formData.tipo === 'erro' || formData.tipo === 'duvida') && (
                <div className="space-y-2">
                  <Label className="text-white/90 drop-shadow-sm">
                    Passos para Reproduzir
                  </Label>
                  <Textarea
                    value={formData.passos}
                    onChange={(e) =>
                      setFormData({ ...formData, passos: e.target.value })
                    }
                    placeholder={`1. Acessar a página...\n2. Clicar no botão...\n3. Preencher o campo...\n4. Observar o erro...`}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[120px] resize-none"
                  />
                </div>
              )}

              {/* Comportamento Esperado vs Atual */}
              {formData.tipo === 'erro' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/90 drop-shadow-sm">
                      ✅ Comportamento Esperado
                    </Label>
                    <Textarea
                      value={formData.comportamentoEsperado}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          comportamentoEsperado: e.target.value,
                        })
                      }
                      placeholder="O que deveria acontecer..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/90 drop-shadow-sm">
                      ❌ Comportamento Atual
                    </Label>
                    <Textarea
                      value={formData.comportamentoAtual}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          comportamentoAtual: e.target.value,
                        })
                      }
                      placeholder="O que está acontecendo..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </Glass>

          {/* ANEXOS */}
          <Glass variant="white" blur="lg" className="p-8 rounded-xl">
            <h2 className="text-white drop-shadow-lg mb-6">
              Anexos (Opcional)
            </h2>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-white/50 hover:bg-white/5 transition-all duration-200">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className="w-10 h-10 text-white/60" />
                  <div>
                    <div className="text-white drop-shadow-sm mb-1">
                      Clique para adicionar arquivos
                    </div>
                    <div className="text-white/60 text-sm">
                      Screenshots, documentos ou vídeos (max 10MB cada)
                    </div>
                  </div>
                </label>
              </div>

              {/* Lista de Anexos */}
              {formData.anexos.length > 0 && (
                <div className="space-y-2">
                  {formData.anexos.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/10 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-white/60" />
                        <div>
                          <div className="text-white drop-shadow-sm text-sm">
                            {file.name}
                          </div>
                          <div className="text-white/60 text-xs">
                            {(file.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerAnexo(index)}
                        className="p-1 hover:bg-white/10 rounded transition-all duration-200"
                      >
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Glass>

          {/* BOTÕES */}
          <div className="flex flex-col sm:flex-row gap-4">
            <GlassButton
              type="submit"
              variant="turquoise"
              className="flex-1 sm:flex-initial sm:min-w-[200px] flex items-center justify-center gap-2 text-[rgb(255,255,255)]"
            >
              <Send className="w-5 h-5" />
              Enviar Solicitação
            </GlassButton>

            <GlassButton
              type="button"
              variant="white"
              onClick={() =>
                setFormData({
                  tipo: 'erro',
                  titulo: '',
                  descricao: '',
                  severidade: 'media',
                  pagina: '',
                  passos: '',
                  comportamentoEsperado: '',
                  comportamentoAtual: '',
                  navegador: '',
                  anexos: [],
                })
              }
              className="flex-1 sm:flex-initial sm:min-w-[150px] text-[rgb(255,255,255)]"
            >
              Limpar Formulário
            </GlassButton>
          </div>
        </form>

        {/* DICAS */}
        <Glass variant="white" blur="lg" className="p-6 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div className="text-white/80 drop-shadow-sm text-sm space-y-2">
              <div className="text-white drop-shadow-md">💡 Dicas para um relato eficaz:</div>
              <ul className="list-disc list-inside space-y-1 text-white/70">
                <li>Seja específico e detalhado na descrição</li>
                <li>Inclua screenshots ou vídeos sempre que possível</li>
                <li>Liste todos os passos para reproduzir o problema</li>
                <li>Mencione se o erro é recorrente ou ocasional</li>
                <li>Informe o horário aproximado em que ocorreu</li>
              </ul>
            </div>
          </div>
        </Glass>
      </div>
    </RHLayout>
  );
}
